'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import {
  BookOpen,
  FolderPlus,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Code,
  ListPlus,
  Download,
  ChevronRight,
  Folder,
  Layers,
  ArrowLeft,
  Search,
} from 'lucide-react';

const getInitialQuestionsCache = () => {
  if (typeof window !== 'undefined' && (window as any).__ADMIN_QUESTIONS_CACHE__) {
    return (window as any).__ADMIN_QUESTIONS_CACHE__;
  }
  return null;
};

export default function QuestionManagementPage() {
  const initialCache = getInitialQuestionsCache();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>(initialCache?.courses || []);
  const [questions, setQuestions] = useState<any[]>(initialCache?.questions || []);
  const [loading, setLoading] = useState(!initialCache);

  // Selected Scope
  const [selectedCourseId, setSelectedCourseId] = useState(initialCache?.courses?.[0]?._id || '');
  const [currentLevel, setCurrentLevel] = useState<'subjects' | 'topics' | 'questions'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Global search mode toggle
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');
  const [flatSearch, setFlatSearch] = useState('');

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Topic Modal
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // Single Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionType, setQuestionType] = useState<'MCQ' | 'Short Answer' | 'Long Answer'>('MCQ');
  const [topicTag, setTopicTag] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [questionMarks, setQuestionMarks] = useState<number>(1);
  const [explanation, setExplanation] = useState('');
  const [detailedExplanation, setDetailedExplanation] = useState('');
  const [error, setError] = useState('');

  // Bulk Question Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'document' | 'excel' | 'text' | 'form'>('document');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsing, setExcelParsing] = useState(false);
  const [parsedExcelQuestions, setParsedExcelQuestions] = useState<any[]>([]);
  const [excelError, setExcelError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docParsing, setDocParsing] = useState(false);
  const [parsedDocQuestions, setParsedDocQuestions] = useState<any[]>([]);
  const [docError, setDocError] = useState('');
  const [bulkFormQuestions, setBulkFormQuestions] = useState<any[]>([
    { topic_tag: '', question_text: '', options: ['', '', '', ''], correct_option: 0, explanation: '' },
  ]);
  const [bulkError, setBulkError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // Default Subject Lists per course
  const [customSubjects, setCustomSubjects] = useState<Record<string, string[]>>({});
  const [customTopics, setCustomTopics] = useState<Record<string, string[]>>({}); // subjectKey -> topics[]

  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  const fetchData = async () => {
    if (!initialCache) setLoading(true);
    try {
      // Decode admin token from cookie if available
      let adminInfo = null;
      try {
        const match = document.cookie.match(/admin_token=([^;]+)/);
        if (match) {
          const payloadBase64 = match[1].split('.')[1];
          if (payloadBase64) {
            adminInfo = JSON.parse(atob(payloadBase64));
            setCurrentAdmin(adminInfo);
          }
        }
      } catch (e) {
        console.error(e);
      }

      const [cRes, qRes] = await Promise.all([fetch('/api/courses'), fetch('/api/questions')]);
      const cData = await cRes.json();
      const qData = await qRes.json();

      let loadedCourses = cData.courses || [];
      if (adminInfo && adminInfo.allowed_courses && !adminInfo.allowed_courses.includes('all') && adminInfo.role !== 'Super Admin') {
        loadedCourses = loadedCourses.filter((c: any) => adminInfo.allowed_courses.includes(c._id));
      }

      const newCache = {
        courses: loadedCourses,
        questions: qData.questions || [],
      };
      if (typeof window !== 'undefined') {
        (window as any).__ADMIN_QUESTIONS_CACHE__ = newCache;
      }

      setCourses(loadedCourses);
      if (loadedCourses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(loadedCourses[0]._id);
      }

      setQuestions(qData.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Subjects & Topics dynamically from questions & custom lists
  const activeCourse = courses.find((c) => c._id === selectedCourseId);

  const courseQuestions = questions.filter((q) => {
    const cId = typeof q.course_id === 'object' ? q.course_id?._id : q.course_id;
    return String(cId) === String(selectedCourseId);
  });

  // Extract subjects (e.g. Physics from "Physics - Electrostatics" or topic_tag)
  const derivedSubjectsMap: Record<string, any[]> = {};

  // Read subjects configured directly on activeCourse!
  const configuredCourseSubjects = activeCourse?.subjects && Array.isArray(activeCourse.subjects) && activeCourse.subjects.length > 0
    ? activeCourse.subjects
    : ['Physics', 'Chemistry', 'Biology'];

  const userAddedSubs = customSubjects[selectedCourseId] || [];
  const allSubNames = Array.from(new Set([...configuredCourseSubjects, ...userAddedSubs]));

  allSubNames.forEach((sName) => {
    derivedSubjectsMap[sName] = [];
  });

  courseQuestions.forEach((q) => {
    const tag = (q.topic_tag || '').trim();
    let sName = '';

    // 1. Explicit q.subject property (highest priority)
    if (q.subject) {
      const matched = allSubNames.find((s) => s.toLowerCase() === String(q.subject).trim().toLowerCase());
      if (matched) sName = matched;
    }

    // 2. Check candidate before hyphen (e.g. "Chemistry" from "Chemistry - Organic")
    if (!sName && tag.includes('-')) {
      const candidate = tag.split('-')[0].trim();
      const matched = allSubNames.find((s) => s.toLowerCase() === candidate.toLowerCase());
      if (matched) sName = matched;
    }

    // 3. Substring match ANYWHERE inside topic_tag (e.g. "Chemistry" inside "100 - Environmental Chemistry")
    if (!sName && tag) {
      const matched = allSubNames.find((s) => tag.toLowerCase().includes(s.toLowerCase()));
      if (matched) sName = matched;
    }

    // 4. If selectedSubject is active and valid, use selectedSubject
    if (!sName && selectedSubject && allSubNames.some((s) => s.toLowerCase() === selectedSubject.toLowerCase())) {
      sName = allSubNames.find((s) => s.toLowerCase() === selectedSubject.toLowerCase()) || selectedSubject;
    }

    // 5. Fallback to primary subject only if absolutely no match found
    if (!sName) {
      sName = allSubNames[0] || 'Physics';
    }

    if (!derivedSubjectsMap[sName]) derivedSubjectsMap[sName] = [];
    derivedSubjectsMap[sName].push(q);
  });

  // Level 2 topics for selectedSubject
  const subjectQuestions = derivedSubjectsMap[selectedSubject] || [];
  const topicsMap: Record<string, any[]> = {};

  const userAddedTopics = customTopics[`${selectedCourseId}_${selectedSubject}`] || [];

  subjectQuestions.forEach((q) => {
    const tag = (q.topic_tag || '').trim();
    let tName = tag;
    if (tag.includes('-')) {
      const parts = tag.split('-').map((p: string) => p.trim());
      if (parts[0].toLowerCase() === selectedSubject.toLowerCase()) {
        tName = parts.slice(1).join(' - ').trim();
      } else {
        tName = tag;
      }
    }
    if (!tName || tName.toLowerCase() === selectedSubject.toLowerCase()) {
      tName = 'General Module';
    }
    if (!topicsMap[tName]) topicsMap[tName] = [];
    topicsMap[tName].push(q);
  });

  userAddedTopics.forEach((t) => {
    if (!topicsMap[t]) topicsMap[t] = [];
  });

  // Level 3 questions for selectedTopic
  const topicQuestions = (topicsMap[selectedTopic] || []).concat(
    subjectQuestions.filter((q) => {
      const tag = (q.topic_tag || '').trim().toLowerCase();
      const sTopicLower = selectedTopic.toLowerCase();
      if (!tag) return false;
      if (tag === sTopicLower) return true;
      if (tag.endsWith(`- ${sTopicLower}`) || tag.endsWith(`-${sTopicLower}`)) return true;
      if (tag.includes(sTopicLower)) return true;
      return false;
    })
  );

  const uniqueTopicQuestions = Array.from(new Set(topicQuestions.map((q) => q._id)))
    .map((id) => topicQuestions.find((q) => q._id === id))
    .filter(Boolean);

  // Handlers
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const sName = newSubjectName.trim();
    setCustomSubjects((prev) => {
      const updated = {
        ...prev,
        [selectedCourseId]: Array.from(new Set([...(prev[selectedCourseId] || []), sName])),
      };
      try {
        localStorage.setItem('exam_portal_custom_subjects', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    setNewSubjectName('');
    setShowSubjectModal(false);
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    const tName = newTopicName.trim();
    const key = `${selectedCourseId}_${selectedSubject}`;
    setCustomTopics((prev) => {
      const updated = {
        ...prev,
        [key]: Array.from(new Set([...(prev[key] || []), tName])),
      };
      try {
        localStorage.setItem('exam_portal_custom_topics', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    setNewTopicName('');
    setShowTopicModal(false);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const computedTag = selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : topicTag || 'General';

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourseId,
          subject: selectedSubject || '',
          topic_tag: computedTag,
          question_type: questionType,
          question_text: questionText,
          options: questionType === 'MCQ' ? options : [],
          correct_option: questionType === 'MCQ' ? correctOption : 0,
          sample_answer: sampleAnswer,
          marks: questionMarks,
          explanation,
          detailed_explanation: detailedExplanation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add question');
      } else {
        setShowAddModal(false);
        setQuestionText('');
        setSampleAnswer('');
        setExplanation('');
        setDetailedExplanation('');
        setQuestionType('MCQ');
        setQuestionMarks(1);
        setOptions(['', '', '', '']);

        if (typeof window !== 'undefined') {
          (window as any).__ADMIN_QUESTIONS_CACHE__ = null;
          (window as any).__ADMIN_DASHBOARD_CACHE__ = null;
        }
        fetchData();
      }
    } catch (err: any) {
      setError('Failed to create question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    setDocParsing(true);
    setDocError('');
    setBulkError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const defaultTag = selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : 'General';
      formData.append('defaultTopic', defaultTag);

      const res = await fetch('/api/questions/parse-document', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setDocError(data.error || 'Failed to parse document');
        setParsedDocQuestions([]);
      } else {
        setParsedDocQuestions(data.questions || []);
      }
    } catch (err: any) {
      setDocError('Error uploading and parsing document');
      setParsedDocQuestions([]);
    } finally {
      setDocParsing(false);
    }
  };

  const downloadSampleDocTemplate = () => {
    const sampleContent = `Topic: ${selectedSubject || 'Physics'} - ${selectedTopic || 'Kinematics'}

Q1. What is the acceleration due to gravity near Earth's surface?
A) 9.8 m/s^2
B) 8.9 m/s^2
C) 10.5 m/s^2
D) 9.8 km/s^2
Answer: A
Explanation: Standard acceleration due to gravity at sea level is approximately 9.8 m/s^2.

Q2. Which physical quantity is defined as the rate of doing work?
A) Force
B) Energy
C) Power
D) Momentum
Answer: C
Explanation: Power is the rate at which work is done or energy is transferred.
`;

    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_questions_document.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel / Spreadsheet file parsing
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelParsing(true);
    setExcelError('');
    setBulkError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonRows || jsonRows.length === 0) {
        setExcelError('The selected spreadsheet is empty or has no readable rows.');
        setParsedExcelQuestions([]);
        return;
      }

      const defaultTag = selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : 'General';

      const parsedList: any[] = [];
      jsonRows.forEach((row) => {
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach((k) => {
          const normKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          normalizedRow[normKey] = row[k];
        });

        const qText = String(
          normalizedRow['question'] ||
          normalizedRow['questiontext'] ||
          normalizedRow['prompt'] ||
          normalizedRow['q'] ||
          normalizedRow['questionprompt'] ||
          ''
        ).trim();

        const optA = String(normalizedRow['optiona'] || normalizedRow['option1'] || normalizedRow['a'] || '').trim();
        const optB = String(normalizedRow['optionb'] || normalizedRow['option2'] || normalizedRow['b'] || '').trim();
        const optC = String(normalizedRow['optionc'] || normalizedRow['option3'] || normalizedRow['c'] || '').trim();
        const optD = String(normalizedRow['optiond'] || normalizedRow['option4'] || normalizedRow['d'] || '').trim();

        const opts = [optA, optB, optC, optD].filter(Boolean);

        const rawAns = String(
          normalizedRow['correctoption'] ||
          normalizedRow['correctanswer'] ||
          normalizedRow['answer'] ||
          normalizedRow['ans'] ||
          normalizedRow['correct'] ||
          ''
        ).trim();

        let correctIndex = 0;
        if (rawAns) {
          const upperAns = rawAns.toUpperCase();
          if (upperAns === 'A' || upperAns === '1' || upperAns === 'OPTION A' || upperAns === 'OPTION 1') correctIndex = 0;
          else if (upperAns === 'B' || upperAns === '2' || upperAns === 'OPTION B' || upperAns === 'OPTION 2') correctIndex = 1;
          else if (upperAns === 'C' || upperAns === '3' || upperAns === 'OPTION C' || upperAns === 'OPTION 3') correctIndex = 2;
          else if (upperAns === 'D' || upperAns === '4' || upperAns === 'OPTION D' || upperAns === 'OPTION 4') correctIndex = 3;
          else if (!isNaN(Number(rawAns)) && Number(rawAns) >= 0 && Number(rawAns) <= 3) {
            correctIndex = Number(rawAns);
          } else {
            const foundIdx = opts.findIndex((o) => o.toLowerCase() === rawAns.toLowerCase());
            if (foundIdx !== -1) correctIndex = foundIdx;
          }
        }

        const exp = String(
          normalizedRow['explanation'] ||
          normalizedRow['normalexplanation'] ||
          normalizedRow['shortexplanation'] ||
          normalizedRow['solution'] ||
          normalizedRow['exp'] ||
          normalizedRow['ansexplanation'] ||
          ''
        ).trim();

        const detailedExp = String(
          normalizedRow['detailedexplanation'] ||
          normalizedRow['longexplanation'] ||
          normalizedRow['detailedsolution'] ||
          normalizedRow['stepbystep'] ||
          normalizedRow['detaileddescription'] ||
          ''
        ).trim();

        const subj = String(normalizedRow['subject'] || selectedSubject || 'Physics').trim();
        const chap = String(normalizedRow['chapter'] || normalizedRow['topic'] || normalizedRow['topictag'] || normalizedRow['tag'] || selectedTopic || '').trim();

        let finalTopicTag = '';
        if (subj && chap) {
          if (chap.toLowerCase().startsWith(subj.toLowerCase() + ' -')) {
            finalTopicTag = chap;
          } else {
            finalTopicTag = `${subj} - ${chap}`;
          }
        } else if (chap) {
          const activeSub = selectedSubject || 'Physics';
          finalTopicTag = `${activeSub} - ${chap}`;
        } else {
          finalTopicTag = defaultTag !== 'General' ? defaultTag : `${selectedSubject || 'Physics'} - ${selectedTopic || 'General'}`;
        }

        if (qText) {
          parsedList.push({
            course_id: selectedCourseId,
            subject: subj,
            topic_tag: finalTopicTag,
            question_text: qText,
            options: opts.length >= 2 ? opts : [optA || 'Option A', optB || 'Option B', optC || 'Option C', optD || 'Option D'],
            correct_option: correctIndex,
            explanation: exp || (opts[correctIndex] ? `Correct Answer: ${opts[correctIndex]}` : ''),
            detailed_explanation: detailedExp,
          });
        }
      });

      if (parsedList.length === 0) {
        setExcelError('No valid questions could be extracted. Make sure column headers include Question, Option A, Option B, Option C, Option D, Answer.');
        setParsedExcelQuestions([]);
      } else {
        setParsedExcelQuestions(parsedList);
      }
    } catch (err: any) {
      setExcelError(err.message || 'Failed to parse Excel file');
      setParsedExcelQuestions([]);
    } finally {
      setExcelParsing(false);
    }
  };

  const downloadSampleExcelTemplate = () => {
    const sampleData = [
      {
        Subject: selectedSubject || 'Physics',
        Topic: selectedTopic || 'Electrostatics',
        Question: 'What is the SI unit of electric charge?',
        'Option A': 'Coulomb',
        'Option B': 'Ampere',
        'Option C': 'Volt',
        'Option D': 'Ohm',
        Answer: 'A',
        Explanation: 'Electric charge is measured in Coulombs (C).',
        'Detailed Explanation': 'Step 1: Electric charge is a fundamental property of matter.\nStep 2: SI unit of electric charge is Coulomb (C), named after Charles-Augustin de Coulomb.\nStep 3: 1 Coulomb is defined as charge transported by 1 Ampere current in 1 second (Q = I * t).'
      },
      {
        Subject: selectedSubject || 'Physics',
        Topic: selectedTopic || 'Electrostatics',
        Question: 'The electric field inside a hollow conducting sphere is:',
        'Option A': 'Infinite',
        'Option B': 'Zero',
        'Option C': 'Equal to surface field',
        'Option D': 'Variable',
        Answer: 'B',
        Explanation: 'According to Gauss\'s Law, net charge inside a conductor is zero, hence electric field is zero.',
        'Detailed Explanation': 'Step 1: Apply Gauss\'s Law to a spherical surface inside the hollow sphere.\nStep 2: Flux = Enclosed Charge / Permittivity. Since all excess charge resides on outer surface of conductor, Enclosed Charge = 0.\nStep 3: Therefore, Electric Field E = 0 at all points inside.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    XLSX.writeFile(workbook, 'sample_questions_template.xlsx');
  };

  // Plain text parsing
  const parsePlainText = (raw: string, targetCourse: string) => {
    const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    const parsed: any[] = [];
    const defaultTag = selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : 'General';

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let topic_tag = defaultTag;
      let qText = '';
      const opts: string[] = [];
      let correct = 0;
      let exp = '';

      for (const line of lines) {
        if (line.toLowerCase().startsWith('topic:')) {
          topic_tag = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('q:') || line.toLowerCase().startsWith('question:')) {
          qText = line.replace(/^(q:|question:\s*\d*[\.:]?)/i, '').trim();
        } else if (/^[A-D][\):.]/i.test(line)) {
          opts.push(line.replace(/^[A-D][\):.]\s*/i, '').trim());
        } else if (line.toLowerCase().startsWith('ans:') || line.toLowerCase().startsWith('answer:')) {
          const rawAns = line.replace(/^(ans:|answer:)\s*/i, '').trim().toUpperCase();
          if (rawAns.startsWith('B')) correct = 1;
          else if (rawAns.startsWith('C')) correct = 2;
          else if (rawAns.startsWith('D')) correct = 3;
          else correct = 0;
        } else if (line.toLowerCase().startsWith('exp:') || line.toLowerCase().startsWith('explanation:')) {
          exp = line.replace(/^(exp:|explanation:)\s*/i, '').trim();
        } else if (!qText && !opts.length) {
          qText = line.replace(/^\d+[\.:]\s*/, '');
        }
      }

      if (qText && opts.length >= 2) {
        while (opts.length < 4) {
          opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        }
        parsed.push({
          course_id: targetCourse,
          topic_tag,
          question_text: qText,
          options: opts.slice(0, 4),
          correct_option: correct,
          explanation: exp,
        });
      }
    }

    return parsed;
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    setSubmitting(true);

    try {
      let questionsToSubmit: any[] = [];

      if (bulkMode === 'document') {
        if (!parsedDocQuestions.length) {
          setBulkError('Please upload a valid PDF or Word document containing questions.');
          setSubmitting(false);
          return;
        }
        questionsToSubmit = parsedDocQuestions.map((q) => ({
          ...q,
          course_id: selectedCourseId,
          subject: q.subject || selectedSubject || '',
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : selectedSubject ? `${selectedSubject} - General` : 'General'),
        }));
      } else if (bulkMode === 'text') {
        if (!bulkText.trim()) {
          setBulkError('Please paste questions in Q&A plain text format.');
          setSubmitting(false);
          return;
        }
        questionsToSubmit = parsePlainText(bulkText, selectedCourseId).map((q) => ({
          ...q,
          subject: selectedSubject || '',
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : selectedSubject ? `${selectedSubject} - General` : 'General'),
        }));
      } else if (bulkMode === 'excel') {
        if (!parsedExcelQuestions.length) {
          setBulkError('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file containing questions.');
          setSubmitting(false);
          return;
        }
        questionsToSubmit = parsedExcelQuestions.map((q) => ({
          ...q,
          course_id: selectedCourseId,
          subject: q.subject || selectedSubject || '',
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : selectedSubject ? `${selectedSubject} - General` : 'General'),
        }));
      } else {
        questionsToSubmit = bulkFormQuestions.map((q) => ({
          ...q,
          course_id: selectedCourseId,
          subject: q.subject || selectedSubject || '',
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : selectedSubject ? `${selectedSubject} - General` : 'General'),
        }));
      }

      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToSubmit }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBulkError(data.error || 'Failed to bulk upload questions');
      } else {
        setShowBulkModal(false);
        setExcelFileName('');
        setParsedExcelQuestions([]);
        setExcelError('');
        setBulkText('');
        setParsedDocQuestions([]);
        setDocFileName('');
        setDocError('');

        if (typeof window !== 'undefined') {
          (window as any).__ADMIN_QUESTIONS_CACHE__ = null;
          (window as any).__ADMIN_DASHBOARD_CACHE__ = null;
        }
        fetchData();
      }
    } catch (err: any) {
      setBulkError(err.message || 'An error occurred during bulk upload');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      setDeletingQuestionId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTopicModule = async (e: React.MouseEvent, tName: string, qList: any[]) => {
    e.stopPropagation();
    const count = qList.length;
    const msg = count > 0 
      ? `Are you sure you want to delete topic module "${tName}" and all ${count} questions inside it?`
      : `Are you sure you want to delete topic module "${tName}"?`;

    if (!confirm(msg)) return;

    try {
      if (count > 0) {
        const deletePromises = qList.map((q) => fetch(`/api/questions/${q._id}`, { method: 'DELETE' }));
        await Promise.all(deletePromises);
      }

      const key = `${selectedCourseId}_${selectedSubject}`;
      setCustomTopics((prev) => {
        const updatedList = (prev[key] || []).filter((t) => t !== tName);
        const updated = { ...prev, [key]: updatedList };
        try {
          localStorage.setItem('exam_portal_custom_topics', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });

      if (typeof window !== 'undefined') {
        (window as any).__ADMIN_QUESTIONS_CACHE__ = null;
        (window as any).__ADMIN_DASHBOARD_CACHE__ = null;
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete topic module:', err);
      alert('Failed to delete topic module');
    }
  };

  const handleDeleteSubjectCard = async (e: React.MouseEvent, sName: string, qList: any[]) => {
    e.stopPropagation();
    const count = qList.length;
    const msg = count > 0
      ? `Are you sure you want to delete subject "${sName}" and all ${count} questions inside it?`
      : `Are you sure you want to delete subject "${sName}"?`;

    if (!confirm(msg)) return;

    try {
      if (count > 0) {
        const deletePromises = qList.map((q) => fetch(`/api/questions/${q._id}`, { method: 'DELETE' }));
        await Promise.all(deletePromises);
      }

      setCustomSubjects((prev) => {
        const updatedList = (prev[selectedCourseId] || []).filter((s) => s !== sName);
        const updated = { ...prev, [selectedCourseId]: updatedList };
        try {
          localStorage.setItem('exam_portal_custom_subjects', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });

      if (typeof window !== 'undefined') {
        (window as any).__ADMIN_QUESTIONS_CACHE__ = null;
        (window as any).__ADMIN_DASHBOARD_CACHE__ = null;
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      alert('Failed to delete subject');
    }
  };

  const handlePageBack = () => {
    if (currentLevel === 'questions') {
      setCurrentLevel('topics');
      setSelectedTopic('');
    } else if (currentLevel === 'topics') {
      setCurrentLevel('subjects');
      setSelectedSubject('');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Hierarchical Question Management"
          subtitle="Manage Subjects ➔ Topics ➔ Question Banks (FR-31, FR-32)"
          onBack={handlePageBack}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Top Bar Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Target Course:</span>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setCurrentLevel('subjects');
                  setSelectedSubject('');
                  setSelectedTopic('');
                }}
                className="text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('hierarchy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'hierarchy'
                  ? 'bg-brand-800 text-white dark:bg-brand-700'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" /> Hierarchical View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'flat'
                  ? 'bg-brand-800 text-white dark:bg-brand-700'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                <Search className="w-3.5 h-3.5 inline mr-1" /> All Questions List ({courseQuestions.length})
              </button>
            </div>
          </div>

          {/* HIERARCHICAL VIEW MODE */}
          {viewMode === 'hierarchy' && (
            <div className="space-y-6">
              {/* Breadcrumb Navigation Trail */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setCurrentLevel('subjects');
                    setSelectedSubject('');
                    setSelectedTopic('');
                  }}
                  className={`hover:underline flex items-center gap-1 ${currentLevel === 'subjects' ? 'text-[#0B192C] dark:text-blue-400 font-extrabold' : ''
                    }`}
                >
                  <BookOpen className="w-4 h-4" /> {activeCourse?.name || 'Course Subjects'}
                </button>

                {selectedSubject && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => {
                        setCurrentLevel('topics');
                        setSelectedTopic('');
                      }}
                      className={`hover:underline flex items-center gap-1 ${currentLevel === 'topics' ? 'text-[#0B192C] dark:text-blue-400 font-extrabold' : ''
                        }`}
                    >
                      <Folder className="w-4 h-4 text-slate-700 dark:text-slate-300" /> {selectedSubject}
                    </button>
                  </>
                )}

                {selectedTopic && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span className="text-[#0B192C] dark:text-blue-400 font-extrabold flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" /> {selectedTopic}
                    </span>
                  </>
                )}
              </div>

              {/* LEVEL 1: SUBJECT MANAGEMENT */}
              {currentLevel === 'subjects' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Subject Management</h3>
                      <p className="text-xs text-slate-500">Select a subject to view and manage its topic modules.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs hover:border-slate-400 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-slate-700 dark:text-slate-300" /> + Bulk Upload
                      </button>
                      <button
                        onClick={() => setShowSubjectModal(true)}
                        className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <FolderPlus className="w-4 h-4" /> + Add Subject
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {Object.keys(derivedSubjectsMap).map((sName) => {
                      const qList = derivedSubjectsMap[sName] || [];
                      return (
                        <div
                          key={sName}
                          onClick={() => {
                            setSelectedSubject(sName);
                            setCurrentLevel('topics');
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0B192C] dark:bg-slate-800 dark:text-white flex items-center justify-center">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <button
                                onClick={(e) => handleDeleteSubjectCard(e, sName, qList)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                                title={`Delete subject "${sName}" and all ${qList.length} questions inside it`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors mb-1">
                              {sName}
                            </h4>
                            <p className="text-xs text-slate-500">{qList.length} Questions Configured</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#0B192C] dark:text-blue-400">
                            <span>Manage Topics</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEVEL 2: TOPIC MANAGEMENT */}
              {currentLevel === 'topics' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Topic Modules under <span className="text-[#0B192C] dark:text-blue-400">{selectedSubject}</span>
                      </h3>
                      <p className="text-xs text-slate-500">Select a topic module to view, add, or remove questions.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentLevel('subjects')}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Subjects
                      </button>
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs hover:border-slate-400 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-slate-700 dark:text-slate-300" /> + Bulk Upload
                      </button>
                      <button
                        onClick={() => setShowTopicModal(true)}
                        className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> + Add Topic Module
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Object.keys(topicsMap).length === 0 ? (
                      <div className="col-span-full p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        No topic modules created under {selectedSubject}. Click <strong>+ Add Topic Module</strong> above!
                      </div>
                    ) : (
                      Object.keys(topicsMap).map((tName) => {
                        const tQList = topicsMap[tName] || [];
                        return (
                          <div
                            key={tName}
                            onClick={() => {
                              setSelectedTopic(tName);
                              setCurrentLevel('questions');
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-lg p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center">
                                  <Folder className="w-5 h-5" />
                                </div>
                                <button
                                  onClick={(e) => handleDeleteTopicModule(e, tName, tQList)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                                  title={`Delete topic module "${tName}" and all ${tQList.length} questions inside it`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{tName}</h4>
                              <p className="text-xs text-slate-500">{tQList.length} Questions</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#0B192C] dark:text-blue-400">
                              <span>Manage Questions</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* LEVEL 3: QUESTION MANAGEMENT */}
              {currentLevel === 'questions' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Question Bank: {selectedSubject} ➔ <span className="text-[#0B192C] dark:text-blue-400">{selectedTopic}</span>
                      </h3>
                      <p className="text-xs text-slate-500">Add, review, or remove active questions for this topic module.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentLevel('topics')}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Topics
                      </button>
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-slate-700" /> + Bulk Upload
                      </button>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> + Add Question
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {uniqueTopicQuestions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        No questions in {selectedSubject} ➔ {selectedTopic}. Click <strong>+ Add Question</strong> or <strong>+ Bulk Upload</strong> above!
                      </div>
                    ) : (
                      uniqueTopicQuestions.map((q) => (
                        <div
                          key={q._id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px] uppercase">
                                {q.topic_tag || `${selectedSubject} - ${selectedTopic}`}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                q.question_type === 'Long Answer'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : q.question_type === 'Short Answer'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                              }`}>
                                {q.question_type === 'Long Answer' ? '📄 Long Answer' : q.question_type === 'Short Answer' ? '📝 Short Answer' : '🔘 MCQ'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-[10px]">
                                {q.marks || (q.question_type === 'Long Answer' ? 5 : q.question_type === 'Short Answer' ? 2 : 1)} Mark(s)
                              </span>
                            </div>

                            <button
                              onClick={() => setDeletingQuestionId(q._id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Remove Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.question_text}</h4>

                          {(!q.question_type || q.question_type === 'MCQ') && q.options && q.options.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt: string, idx: number) => {
                                const isCorrect = q.correct_option === idx;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-lg border flex items-center gap-2 font-medium ${isCorrect
                                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-bold'
                                      : 'bg-slate-50/50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                      }`}>
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            (q.sample_answer || q.explanation) && (
                              <div className="p-3 rounded-lg border border-purple-200/60 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 text-xs space-y-1">
                                <span className="font-extrabold uppercase text-[10px] text-purple-700 dark:text-purple-400 block">
                                  Model Answer & Key Points:
                                </span>
                                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line font-medium">
                                  {q.sample_answer || q.explanation}
                                </div>
                              </div>
                            )
                          )}

                          {q.explanation && (q.question_type === 'MCQ' || !q.question_type) && (
                            <p className="text-[11px] text-slate-500 italic border-t border-slate-100 dark:border-slate-800/60 pt-2">
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLAT SEARCH VIEW MODE */}
          {viewMode === 'flat' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search questions by keyword or topic..."
                  value={flatSearch}
                  onChange={(e) => setFlatSearch(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-4">
                {courseQuestions
                  .filter((q) => (q.question_text || '').toLowerCase().includes(flatSearch.toLowerCase()) || (q.topic_tag || '').toLowerCase().includes(flatSearch.toLowerCase()))
                  .map((q) => (
                    <div key={q._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-extrabold text-[10px] uppercase">
                          Topic: {q.topic_tag || 'General'}
                        </span>
                        <button onClick={() => setDeletingQuestionId(q._id)} className="text-slate-400 hover:text-rose-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.question_text}</h4>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Add New Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Physics, General Studies, Logical Reasoning"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg shadow-xs">
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add Topic Module under <span className="text-[#0B192C] dark:text-blue-400">{selectedSubject}</span>
              </h3>
              <button onClick={() => setShowTopicModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTopic} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic Module Name</label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g. Electrostatics, Optics, Kinematics"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg shadow-xs">
                  Create Topic Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Question Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-lg my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Bulk Question Import: {selectedSubject} ➔ {selectedTopic || 'General'}
                </h3>
                <p className="text-xs text-slate-500">Choose your preferred import method to build your question bank fast.</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 mb-4 gap-1">
              <button
                type="button"
                onClick={() => setBulkMode('document')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${bulkMode === 'document'
                  ? 'border-[#0B192C] text-[#0B192C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <FileText className="w-4 h-4 text-rose-600" /> PDF & Word Upload (.pdf, .docx)
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('excel')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${bulkMode === 'excel'
                  ? 'border-[#0B192C] text-[#0B192C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel / Sheet Import (.xlsx, .csv)
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('text')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${bulkMode === 'text'
                  ? 'border-[#0B192C] text-[#0B192C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <FileText className="w-4 h-4 text-amber-600" /> Plain Text Q&A Paste
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('form')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${bulkMode === 'form'
                  ? 'border-[#0B192C] text-[#0B192C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <ListPlus className="w-4 h-4 text-blue-600" /> Visual Multi-Card Form
              </button>
            </div>

            {bulkError && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">{bulkError}</div>}

            <form onSubmit={handleBulkSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 text-xs">
              {/* TAB 1: PDF & WORD DOCUMENT FILE UPLOAD */}
              {bulkMode === 'document' && (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg">
                    <div>
                      <h4 className="font-bold text-rose-900 dark:text-rose-300 text-xs">PDF & Word Document Parser</h4>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">Upload .pdf, .docx, or .doc question papers. Questions and assigned answers will be extracted automatically.</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSampleDocTemplate}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" /> Sample Format Guide
                    </button>
                  </div>

                  {docError && (
                    <div className="p-3 bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{docError}</span>
                    </div>
                  )}

                  {!parsedDocQuestions.length ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-800/20 flex-1">
                      {docParsing ? (
                        <div className="flex flex-col items-center space-y-2 py-6">
                          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Extracting questions & answers from document...</span>
                        </div>
                      ) : (
                        <>
                          <FileText className="w-12 h-12 text-rose-500" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm mb-1">
                              {docFileName ? `Selected: ${docFileName}` : 'Upload PDF or Word Document'}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Supports PDF (.pdf), Word (.docx, .doc), and Text (.txt) formats with questions, options & assigned answers.
                            </span>
                          </div>

                          <label className="cursor-pointer px-4 py-2.5 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg shadow-xs text-xs flex items-center gap-2 transition-colors">
                            <Upload className="w-4 h-4" /> Select Question File
                            <input
                              type="file"
                              accept=".pdf,.docx,.doc,.txt"
                              onChange={handleDocFileUpload}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 space-y-3">
                      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            Parsed {parsedDocQuestions.length} Questions from &quot;{docFileName}&quot;
                          </span>
                        </div>
                        <label className="cursor-pointer px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded text-xs">
                          Change File
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={handleDocFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 max-h-[40vh] pr-1">
                        {parsedDocQuestions.map((q: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                Q{idx + 1}. {q.question_text}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold rounded shrink-0 ml-2">
                                {q.topic_tag}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                              {q.options.map((opt: string, optIdx: number) => {
                                const isCorrect = q.correct_option === optIdx;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-1.5 rounded border ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="font-mono mr-1">
                                      {String.fromCharCode(65 + optIdx)}:
                                    </span>
                                    {opt}
                                    {isCorrect && <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓ (Answer)</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                                Explanation: {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PLAIN TEXT Q&A PASTE */}
              {bulkMode === 'text' && (
                <div className="flex-1 flex flex-col space-y-2">
                  <textarea
                    rows={12}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Topic: ${selectedSubject || 'Physics'} - ${selectedTopic || 'Electrostatics'}\nQ: What is the speed of light in vacuum?\nA) 3 x 10^8 m/s\nB) 3 x 10^6 m/s\nC) 3 x 10^10 m/s\nD) 3 x 10^5 m/s\nAnswer: A\nExplanation: Speed of light is 3x10^8 m/s.`}
                    className="w-full flex-1 p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* TAB 3: EXCEL / SPREADSHEET FILE UPLOAD */}
              {bulkMode === 'excel' && (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div>
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">Excel & CSV Spreadsheet Parser</h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Upload .xlsx, .xls, or .csv files. Columns for Question, Options (A-D), Answer, and Explanation will be parsed.</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" /> Download Excel Template
                    </button>
                  </div>

                  {excelError && (
                    <div className="p-3 bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{excelError}</span>
                    </div>
                  )}

                  {!parsedExcelQuestions.length ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-800/20 flex-1">
                      {excelParsing ? (
                        <div className="flex flex-col items-center space-y-2 py-6">
                          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Parsing Excel spreadsheet...</span>
                        </div>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm mb-1">
                              {excelFileName ? `Selected: ${excelFileName}` : 'Upload Excel or CSV File'}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) spreadsheets with question & answer columns.
                            </span>
                          </div>

                          <label className="cursor-pointer px-4 py-2.5 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg shadow-xs text-xs flex items-center gap-2 transition-colors">
                            <Upload className="w-4 h-4" /> Select Excel / CSV File
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleExcelFileUpload}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 space-y-3">
                      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            Parsed {parsedExcelQuestions.length} Questions from &quot;{excelFileName}&quot;
                          </span>
                        </div>
                        <label className="cursor-pointer px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded text-xs">
                          Change File
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleExcelFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 max-h-[40vh] pr-1">
                        {parsedExcelQuestions.map((q: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                Q{idx + 1}. {q.question_text}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded shrink-0 ml-2">
                                {q.topic_tag}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                              {q.options.map((opt: string, optIdx: number) => {
                                const isCorrect = q.correct_option === optIdx;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-1.5 rounded border ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="font-mono mr-1">
                                      {String.fromCharCode(65 + optIdx)}:
                                    </span>
                                    {opt}
                                    {isCorrect && <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓ (Answer)</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                                Explanation: {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: VISUAL MULTI-QUESTION FORM */}
              {bulkMode === 'form' && (
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 max-h-[50vh]">
                  {bulkFormQuestions.map((fq, qIdx) => (
                    <div key={qIdx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 relative space-y-3">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">Question #{qIdx + 1}</span>
                      <textarea
                        required
                        rows={2}
                        value={fq.question_text}
                        onChange={(e) => {
                          const updated = [...bulkFormQuestions];
                          updated[qIdx].question_text = e.target.value;
                          setBulkFormQuestions(updated);
                        }}
                        placeholder="Question Prompt..."
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                      <div className="space-y-1.5">
                        {fq.options.map((optVal: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={fq.correct_option === optIdx}
                              onChange={() => {
                                const updated = [...bulkFormQuestions];
                                updated[qIdx].correct_option = optIdx;
                                setBulkFormQuestions(updated);
                              }}
                            />
                            <span className="font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                            <input
                              type="text"
                              required
                              value={optVal}
                              onChange={(e) => {
                                const updated = [...bulkFormQuestions];
                                updated[qIdx].options[optIdx] = e.target.value;
                                setBulkFormQuestions(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {submitting ? 'Uploading...' : 'Upload Question Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-md w-full shadow-lg my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add Question under {selectedSubject} ➔ {selectedTopic}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">{error}</div>}

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              {/* Question Type Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Question Format / Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('MCQ');
                      setQuestionMarks(1);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      questionType === 'MCQ'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-extrabold">🔘 Objective</div>
                    <div className="text-[10px] text-slate-400">MCQ (4 Options)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('Short Answer');
                      setQuestionMarks(2);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      questionType === 'Short Answer'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-extrabold">📝 Short Answer</div>
                    <div className="text-[10px] text-slate-400">2-3 Marks (VSA/SA)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('Long Answer');
                      setQuestionMarks(5);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      questionType === 'Long Answer'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-extrabold">📄 Long Answer</div>
                    <div className="text-[10px] text-slate-400">4-5+ Marks (LA)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type the full question prompt..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Marks Input */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Marks Weightage</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={questionMarks}
                  onChange={(e) => setQuestionMarks(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {questionType === 'MCQ' ? (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Options (Select radio for correct answer)</label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === idx}
                        onChange={() => setCorrectOption(idx)}
                      />
                      <span className="font-bold text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model Answer / Evaluation Rubric Key
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={sampleAnswer}
                    onChange={(e) => setSampleAnswer(e.target.value)}
                    placeholder="Provide the complete model answer, key steps, or evaluation points..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Normal / Short Explanation (Optional)</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Concise explanation summary..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Detailed / Step-by-Step Explanation (Optional)</label>
                <textarea
                  rows={4}
                  value={detailedExplanation}
                  onChange={(e) => setDetailedExplanation(e.target.value)}
                  placeholder="Comprehensive step-by-step solution, formulas, and detailed derivation..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Modal */}
      {deletingQuestionId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">Delete Question</h3>
            <p className="text-xs text-slate-500 mb-6">Are you sure you want to delete this question? This action cannot be undone.</p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingQuestionId(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingQuestionId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
