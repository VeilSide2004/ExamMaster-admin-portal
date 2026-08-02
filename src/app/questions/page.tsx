'use client';

import React, { useEffect, useState } from 'react';
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

export default function QuestionManagementPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Scope
  const [selectedCourseId, setSelectedCourseId] = useState('');
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
  const [topicTag, setTopicTag] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');

  // Bulk Question Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'document' | 'text' | 'json' | 'form'>('document');
  const [bulkJson, setBulkJson] = useState('');
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
    setLoading(true);
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
    const tag = q.topic_tag || 'General';
    let sName = 'General';
    if (tag.includes('-')) {
      sName = tag.split('-')[0].trim();
    } else if (allSubNames.some((s) => tag.toLowerCase().includes(s.toLowerCase()))) {
      sName = allSubNames.find((s) => tag.toLowerCase().includes(s.toLowerCase())) || 'General';
    } else {
      sName = tag;
    }
    if (!derivedSubjectsMap[sName]) derivedSubjectsMap[sName] = [];
    derivedSubjectsMap[sName].push(q);
  });

  // Level 2 topics for selectedSubject
  const subjectQuestions = derivedSubjectsMap[selectedSubject] || [];
  const topicsMap: Record<string, any[]> = {};

  const userAddedTopics = customTopics[`${selectedCourseId}_${selectedSubject}`] || [];

  subjectQuestions.forEach((q) => {
    const tag = q.topic_tag || 'General';
    let tName = tag;
    if (tag.includes('-')) {
      tName = tag.split('-').slice(1).join('-').trim();
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
      const tag = q.topic_tag || '';
      return tag === selectedTopic || tag.endsWith(selectedTopic);
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
          topic_tag: computedTag,
          question_text: questionText,
          options,
          correct_option: correctOption,
          explanation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add question');
      } else {
        setShowAddModal(false);
        setQuestionText('');
        setExplanation('');
        setOptions(['', '', '', '']);
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
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : 'General'),
        }));
      } else if (bulkMode === 'text') {
        if (!bulkText.trim()) {
          setBulkError('Please paste questions in Q&A plain text format.');
          setSubmitting(false);
          return;
        }
        questionsToSubmit = parsePlainText(bulkText, selectedCourseId);
      } else if (bulkMode === 'json') {
        if (!bulkJson.trim()) {
          setBulkError('Please paste a JSON array or object of questions');
          setSubmitting(false);
          return;
        }

        const parsed = JSON.parse(bulkJson);
        let rawList: any[] = [];
        let defaultSubject = '';
        let defaultChapter = '';

        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          defaultSubject = parsed.subject || '';
          defaultChapter = parsed.chapter || '';
          if (Array.isArray(parsed.questions)) {
            rawList = parsed.questions;
          } else if (Array.isArray(parsed.data)) {
            rawList = parsed.data;
          } else {
            rawList = [parsed];
          }
        }

        questionsToSubmit = rawList.map((q: any) => {
          const qText = q.question_text || q.question || q.prompt || '';
          const opts = Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];

          let correctIndex = 0;
          if (typeof q.correct_option === 'number') {
            correctIndex = q.correct_option;
          } else if (typeof q.correctAnswer === 'number') {
            correctIndex = q.correctAnswer;
          } else if (typeof q.correctAnswer === 'string') {
            const idx = opts.findIndex((o: any) => String(o).trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
            if (idx !== -1) {
              correctIndex = idx;
            } else {
              const char = q.correctAnswer.trim().toUpperCase();
              if (char === 'B' || char === '1') correctIndex = 1;
              else if (char === 'C' || char === '2') correctIndex = 2;
              else if (char === 'D' || char === '3') correctIndex = 3;
            }
          }

          const subj = q.subject || defaultSubject || selectedSubject || 'Physics';
          const chap = q.chapter || defaultChapter || selectedTopic || 'Electrostatics';
          const topicTag = q.topic_tag || (subj && chap ? `${subj} - ${chap}` : subj || chap || 'General');

          return {
            course_id: selectedCourseId,
            topic_tag: topicTag,
            question_text: qText,
            options: opts,
            correct_option: correctIndex,
            explanation: q.explanation || `Correct Answer: ${opts[correctIndex] || ''}`,
          };
        });
      } else {
        questionsToSubmit = bulkFormQuestions.map((q) => ({
          ...q,
          course_id: selectedCourseId,
          topic_tag: q.topic_tag || (selectedSubject && selectedTopic ? `${selectedSubject} - ${selectedTopic}` : 'General'),
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
        setBulkJson('');
        setBulkText('');
        setParsedDocQuestions([]);
        setDocFileName('');
        setDocError('');
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
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <FolderPlus className="w-4 h-4" /> + Add Subject
                    </button>
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
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0B192C] dark:bg-slate-800 dark:text-white flex items-center justify-center mb-3">
                              <BookOpen className="w-5 h-5" />
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
                              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center mb-3">
                                <Folder className="w-5 h-5" />
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
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px] uppercase">
                              {q.topic_tag || `${selectedSubject} - ${selectedTopic}`}
                            </span>

                            <button
                              onClick={() => setDeletingQuestionId(q._id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Remove Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.question_text}</h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {q.options?.map((opt: string, idx: number) => {
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

                          {q.explanation && (
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
              <button
                type="button"
                onClick={() => setBulkMode('json')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${bulkMode === 'json'
                  ? 'border-[#0B192C] text-[#0B192C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Code className="w-4 h-4 text-purple-600" /> JSON Import
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

              {/* TAB 3: JSON ARRAY IMPORT */}
              {bulkMode === 'json' && (
                <div className="flex-1 flex flex-col space-y-2">
                  <textarea
                    rows={12}
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    placeholder='[&#10;  {&#10;    "topic_tag": "Physics - Electrostatics",&#10;    "question_text": "...",&#10;    "options": ["A", "B", "C", "D"],&#10;    "correct_option": 0,&#10;    "explanation": "..."&#10;  }&#10;]'
                    className="w-full flex-1 p-3 bg-slate-900 text-slate-100 font-mono text-[11px] border border-slate-800 rounded-xl focus:outline-none resize-none"
                  />
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

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Explanation (Optional)</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Step-by-step solution..."
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
