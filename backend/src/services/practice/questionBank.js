const questionCatalog = {
  variables: {
    concept: 'variables',
    difficulty: 'easy',
    prompt: 'In C++, explain how you declare and initialize a variable. Include the purpose of the type and why initialization matters.',
    answerKeywords: ['variable', 'type', 'initialize', 'value', 'declaration', 'store'],
  },
  loops: {
    concept: 'loops',
    difficulty: 'medium',
    prompt: 'Why do programmers use loops? Describe how a for loop or while loop helps repeat work and control execution.',
    answerKeywords: ['loop', 'repeat', 'condition', 'iteration', 'for', 'while'],
  },
  conditions: {
    concept: 'conditions',
    difficulty: 'easy',
    prompt: 'What is the purpose of an if statement in C++? Explain how it decides whether a block of code runs.',
    answerKeywords: ['if', 'condition', 'true', 'false', 'branch', 'statement'],
  },
  functions: {
    concept: 'functions',
    difficulty: 'medium',
    prompt: 'How do functions improve a program? Explain what a function is and why writing reusable code is useful.',
    answerKeywords: ['function', 'reuse', 'parameter', 'return', 'code', 'block'],
  },
  arrays: {
    concept: 'arrays',
    difficulty: 'medium',
    prompt: 'What is an array in C++ and when would you use one instead of multiple separate variables?',
    answerKeywords: ['array', 'index', 'elements', 'same', 'type', 'values'],
  },
  pointers: {
    concept: 'pointers',
    difficulty: 'medium',
    prompt: 'What is a pointer in C++? Explain what the & and * operators do and why a pointer must point to valid memory before use.',
    answerKeywords: ['pointer', 'address', 'memory', 'dereference', 'valid', 'null'],
  },
  references: {
    concept: 'references',
    difficulty: 'medium',
    prompt: 'How is a C++ reference different from a pointer? Explain why a reference cannot be reseated or null.',
    answerKeywords: ['reference', 'alias', 'cannot', 'null', 'reseat', 'initialize'],
  },
  recursion: {
    concept: 'recursion',
    difficulty: 'medium',
    prompt: 'What are the two required parts of a recursive function? Explain the base case and the recursive step using factorial as an example.',
    answerKeywords: ['recursion', 'base', 'recursive', 'factorial', 'smaller', 'stop'],
  },
  classes: {
    concept: 'classes',
    difficulty: 'medium',
    prompt: 'What is a class in C++ and how does it differ from a struct? Explain members, access control, and what an object is.',
    answerKeywords: ['class', 'object', 'members', 'private', 'public', 'methods'],
  },
  vectors: {
    concept: 'vectors',
    difficulty: 'medium',
    prompt: 'Why would you choose std::vector over a raw C-style array? Explain dynamic size, bounds-checked access, and one growth tradeoff.',
    answerKeywords: ['vector', 'dynamic', 'size', 'array', 'push', 'memory'],
  },
  debugging: {
    concept: 'debugging',
    difficulty: 'easy',
    prompt: 'Your program compiles but prints the wrong answer. Describe a systematic debugging approach: what do you check first, second, third?',
    answerKeywords: ['debug', 'input', 'expected', 'print', 'test', 'narrow'],
  },
  complexity: {
    concept: 'complexity',
    difficulty: 'hard',
    prompt: 'What does O(n log n) mean and when do you see it? Compare it with O(n) and O(n^2) using sorting and nested loops as examples.',
    answerKeywords: ['complexity', 'growth', 'sort', 'nested', 'loops', 'input'],
  },
  strings: {
    concept: 'strings',
    difficulty: 'easy',
    prompt: 'How do C-style strings and std::string differ? Explain null termination and why std::string is safer for everyday code.',
    answerKeywords: ['string', 'null', 'terminator', 'safe', 'character', 'length'],
  },
  memory: {
    concept: 'memory',
    difficulty: 'hard',
    prompt: 'Explain stack vs heap memory in C++. Where do local variables live, what does new allocate, and what happens if you forget delete?',
    answerKeywords: ['stack', 'heap', 'local', 'new', 'delete', 'leak'],
  },
};

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function pickQuestion(concept) {
  if (concept && questionCatalog[concept]) {
    return { ...questionCatalog[concept] };
  }
  const keys = Object.keys(questionCatalog);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { ...questionCatalog[key] };
}

function generatePracticeQuestion(concept) {
  const question = pickQuestion(concept);
  return {
    id: `q-${question.concept}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    concept: question.concept,
    difficulty: question.difficulty,
    prompt: question.prompt,
    answerKeywords: [...new Set(question.answerKeywords.map((word) => word.toLowerCase()))],
  };
}

function gradePracticeAnswer(question, submittedAnswer) {
  if (!question || !submittedAnswer || !String(submittedAnswer).trim()) {
    return {
      correct: false,
      score: 0,
      feedback: 'Your answer is empty. Try describing the concept in your own words.',
    };
  }

  const normalizedAnswer = normalizeText(submittedAnswer);
  const keywords = Array.isArray(question.answerKeywords) ? question.answerKeywords : [];
  const matches = keywords.filter((keyword) => normalizedAnswer.includes(normalizeText(keyword)));
  const coverage = matches.length / Math.max(1, keywords.length);
  const wordCount = normalizedAnswer.split(/\s+/).filter(Boolean).length;
  const score = Math.min(100, Math.max(0, Math.round((coverage * 85) + Math.min(wordCount, 20) * 0.75)));
  const correct = coverage >= 0.45 || matches.length >= 2;

  return {
    correct,
    score,
    feedback: correct
      ? 'Good answer. You covered the key idea and described the concept clearly.'
      : 'Your answer is too vague. Try to mention the main idea, the condition or action, and why it matters.',
    matches,
    coverage,
  };
}

function listConcepts() {
  return Object.values(questionCatalog).map((q) => ({ concept: q.concept, difficulty: q.difficulty }));
}

module.exports = { generatePracticeQuestion, gradePracticeAnswer, questionCatalog, listConcepts };
