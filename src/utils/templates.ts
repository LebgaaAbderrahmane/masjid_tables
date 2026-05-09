import type { NoteTemplate } from '../types';

export const noteTemplates: Record<string, NoteTemplate> = {
  general: {
    title: 'ملاحظة مهمة',
    content: 'يرجى الالتزام بالمهام الموكلة إليكم.',
    isVerse: false
  },
  reminder: {
    title: 'تذكير',
    content: 'هذا البرنامج مصمم للتنظيم ولكنه لا يدعو أبداً إلى ترك روح المبادرة.',
    isVerse: false
  },
  verse: {
    title: 'قال تعالى',
    content: '﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾ [النساء: 103]',
    isVerse: true
  },
  hadith: {
    title: 'عن عائشة رضي الله عنها قالت',
    content: '{ أمر رسول الله صلى الله عليه وسلم ببناء المساجد في الدور وأن تُنظف وتُطيب }',
    isVerse: true
  }
};