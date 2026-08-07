import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function cleanText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseQuestionsFromText(rawText: string, defaultTopic: string = 'General'): any[] {
  const text = cleanText(rawText);

  // Step 1: Extract Answer Key if present at the bottom of the document
  const answerKeyMap: Record<number, number> = {};
  const answerKeyRegex = /\n\s*(?:answer\s*key|answers?\s*key|answer\s+keys)\s*[:\n]/i;
  const answerKeyMatch = text.search(answerKeyRegex);

  let mainBodyText = text;
  if (answerKeyMatch !== -1) {
    mainBodyText = text.substring(0, answerKeyMatch);
    const keyText = text.substring(answerKeyMatch);
    const keyLines = keyText.split('\n');
    for (const kLine of keyLines) {
      const pairMatches = Array.from(kLine.matchAll(/(?:q|question)?\s*(\d+)\s*[\.\:\-\)\s]+\s*([a-d1-4])/gi));
      for (const m of pairMatches) {
        const qNum = parseInt(m[1], 10);
        const ansChar = m[2].toUpperCase();
        let idx = 0;
        if (ansChar === 'B' || ansChar === '2') idx = 1;
        else if (ansChar === 'C' || ansChar === '3') idx = 2;
        else if (ansChar === 'D' || ansChar === '4') idx = 3;
        answerKeyMap[qNum] = idx;
      }
    }
  }

  // Step 2: Line-by-line streaming parser
  const lines = mainBodyText.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsedQuestions: any[] = [];
  let currentTopic = defaultTopic;

  let currentQ: {
    qNum: number | null;
    topic: string;
    text: string;
    options: string[];
    inlineAnswer: number | null;
    explanation: string;
  } | null = null;

  const isMalformedQuestion = (qText: string, options?: any[]): boolean => {
    if (!qText || typeof qText !== 'string') return true;
    const cleaned = qText.trim().toLowerCase();
    if (cleaned.length <= 2) return true;
    const headerWords = [
      'chemistry', 'physics', 'mathematics', 'math', 'biology', 'botany', 'zoology',
      'inorganic chemistry', 'organic chemistry', 'physical chemistry', 'thermodynamics',
      'kinematics', 'mechanics', 'optics', 'waves', 'magnetism', 'electrostatics',
      'algebra', 'calculus', 'vectors', 'trigonometry', 'geometry', 'general', 'science'
    ];
    if (headerWords.includes(cleaned)) return true;
    if (/^(?:subject|topic|chapter)\s*[\:\-]/i.test(cleaned)) return true;
    if (options && Array.isArray(options) && options.length > 0) {
      const opt0 = String(options[0] || '').trim().toLowerCase();
      if (opt0 === cleaned && options.slice(1).every((o) => /^option\s+[b-d]$/i.test(String(o).trim()))) {
        return true;
      }
    }
    return false;
  };

  function pushCurrentQ() {
    if (!currentQ || !currentQ.text.trim()) return;
    const qText = currentQ.text.trim();
    if (qText.startsWith('%PDF-') || qText.startsWith('>>') || qText.length < 3) return;
    if (isMalformedQuestion(qText, currentQ.options)) return;

    const qNum = currentQ.qNum || parsedQuestions.length + 1;

    let finalCorrectIdx = 0;
    if (currentQ.inlineAnswer !== null) {
      finalCorrectIdx = currentQ.inlineAnswer;
    } else if (answerKeyMap[qNum] !== undefined) {
      finalCorrectIdx = answerKeyMap[qNum];
    }

    const opts = [...currentQ.options];
    while (opts.length < 4) {
      opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
    }

    parsedQuestions.push({
      topic_tag: currentQ.topic || defaultTopic,
      question_text: qText,
      options: opts.slice(0, 4),
      correct_option: finalCorrectIdx,
      explanation: currentQ.explanation.trim() || `Assigned Answer: Option ${String.fromCharCode(65 + finalCorrectIdx)}`,
    });

    currentQ = null;
  }

  for (const line of lines) {
    // Ignore PDF binary structure garbage lines
    if (/^(%pdf-|endobj|\/type|\/mediabox|\/font|\/procset|\/contents|stream|endstream|\/filter|\/length|xref|trailer)/i.test(line)) {
      continue;
    }

    // 1. Check Topic Header
    if (/^(topic|subject|chapter)\s*:/i.test(line)) {
      currentTopic = line.replace(/^(topic|subject|chapter)\s*:\s*/i, '').trim();
      if (currentQ) currentQ.topic = currentTopic;
      continue;
    }

    // 2. Check Question Start line FIRST (e.g. "Q1.", "1.", "Question 1:", "Q.1")
    const qNumMatch = line.match(/^(?:q(?:uestion)?[\s\.]*)?(\d+)[\.\)\:\s]+(.*)/i);
    const isExplicitQPrefix = line.match(/^(?:q(?:uestion)?[\:\.]\s*)/i);

    if (qNumMatch || isExplicitQPrefix) {
      if (currentQ && (currentQ.options.length > 0 || currentQ.text.length > 0)) {
        pushCurrentQ();
      }

      let qNum: number | null = null;
      let promptText = line;

      if (qNumMatch) {
        qNum = parseInt(qNumMatch[1], 10);
        promptText = qNumMatch[2].trim();
      } else {
        promptText = line.replace(/^(q(?:uestion)?[\:\.]?\s*)/i, '').trim();
      }

      currentQ = {
        qNum,
        topic: currentTopic,
        text: promptText,
        options: [],
        inlineAnswer: null,
        explanation: '',
      };
      continue;
    }

    // 3. Check inline Answer:
    if (/^(ans|answer|correct\s*ans(wer)?)\s*:/i.test(line)) {
      if (currentQ) {
        const rawAns = line.replace(/^(ans|answer|correct\s*ans(wer)?)\s*:\s*/i, '').trim().toUpperCase();
        if (rawAns.startsWith('B') || rawAns.startsWith('1') || rawAns.includes('OPTION B')) currentQ.inlineAnswer = 1;
        else if (rawAns.startsWith('C') || rawAns.startsWith('2') || rawAns.includes('OPTION C')) currentQ.inlineAnswer = 2;
        else if (rawAns.startsWith('D') || rawAns.startsWith('3') || rawAns.includes('OPTION D')) currentQ.inlineAnswer = 3;
        else currentQ.inlineAnswer = 0;
      }
      continue;
    }

    // 4. Check Explanation:
    if (/^(exp|explanation|rationale)\s*:/i.test(line)) {
      if (currentQ) {
        currentQ.explanation = line.replace(/^(exp|explanation|rationale)\s*:\s*/i, '').trim();
      }
      continue;
    }

    // 5. Check Option line (e.g. "A)", "(A)", "A.", "A:", "Option A:")
    const optMatch = line.match(/^(\(?\s*[A-D]\s*[\)\.\:]|option\s+[a-d]\s*[\:\.\)]?)\s*(.*)/i);
    if (optMatch && currentQ) {
      const optLetter = optMatch[1].toUpperCase();
      if (optLetter.includes('A')) {
        if (currentQ.options.length >= 4) {
          pushCurrentQ();
          currentQ = {
            qNum: null,
            topic: currentTopic,
            text: line,
            options: [],
            inlineAnswer: null,
            explanation: '',
          };
          continue;
        }
      }
      currentQ.options.push(optMatch[2].trim());
      continue;
    }

    // 6. Multi-line Accumulation: Append to explanation if explanation is in progress, or question text if before options
    if (currentQ) {
      if (currentQ.explanation) {
        currentQ.explanation += ' ' + line;
      } else if (currentQ.options.length === 0) {
        currentQ.text += ' ' + line;
      }
    } else {
      currentQ = {
        qNum: null,
        topic: currentTopic,
        text: line,
        options: [],
        inlineAnswer: null,
        explanation: '',
      };
    }
  }

  pushCurrentQ();

  return parsedQuestions;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const defaultTopic = (formData.get('defaultTopic') as string) || 'General';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (fileName.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (fileName.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        return NextResponse.json(
          { error: `Could not parse PDF file: ${pdfErr?.message || 'Ensure it is a valid, text-selectable PDF.'}` },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith('.doc')) {
      extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ');
    } else {
      extractedText = buffer.toString('utf-8');
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from the document. Ensure it contains selectable text.' },
        { status: 400 }
      );
    }

    const questions = parseQuestionsFromText(extractedText, defaultTopic);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions detected in the document. Please verify the document format.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      fileName: file.name,
    });
  } catch (err: any) {
    console.error('Document parsing error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
