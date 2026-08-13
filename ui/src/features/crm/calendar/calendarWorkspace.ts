export type CalendarView = 'day' | 'week' | 'month' | 'agenda';
export type CalendarEvent = {
  event_id: string; source: 'recurring'|'session'|'booking'; status: string; date: string;
  start_time: string; end_time: string; class_id: number; class_name: string;
  teacher_id?: number; teacher_name?: string; subject_id?: number; subject_name?: string;
  room_id?: number; room_name?: string; session_id?: number;
  attendance?: { present:number; absent:number; unmarked:number };
};
export type CalendarFilters = { query:string; teacherId:string; classId:string; subjectId:string; roomId:string; status:string };
export type CalendarResource = { type:'teacher'|'class'|'subject'|'room'; id:string; name:string };
export const EMPTY_FILTERS:CalendarFilters={query:'',teacherId:'',classId:'',subjectId:'',roomId:'',status:''};
export const localDateKey=(date:Date)=>{const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,10);};
export const startOfWeek=(date:Date)=>{const d=new Date(date);d.setDate(d.getDate()-((d.getDay()+6)%7));d.setHours(0,0,0,0);return d;};
export const addDays=(date:Date,days:number)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d;};
export const viewRange=(anchor:Date,view:CalendarView)=>{
  if(view==='day'||view==='agenda')return {from:localDateKey(anchor),to:localDateKey(view==='agenda'?addDays(anchor,30):anchor)};
  if(view==='week'){const from=startOfWeek(anchor);return {from:localDateKey(from),to:localDateKey(addDays(from,6))};}
  return {from:localDateKey(new Date(anchor.getFullYear(),anchor.getMonth(),1)),to:localDateKey(new Date(anchor.getFullYear(),anchor.getMonth()+1,0))};
};
export const filterEvents=(events:CalendarEvent[],filters:CalendarFilters)=>events.filter(e=>{
  const q=filters.query.toLowerCase();return (!q||[e.class_name,e.teacher_name,e.subject_name,e.room_name].some(v=>String(v||'').toLowerCase().includes(q)))&&(!filters.teacherId||String(e.teacher_id)===filters.teacherId)&&(!filters.classId||String(e.class_id)===filters.classId)&&(!filters.subjectId||String(e.subject_id)===filters.subjectId)&&(!filters.roomId||String(e.room_id)===filters.roomId)&&(!filters.status||e.status===filters.status);
});
export const statusTone=(status:string)=>({planned:'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',ready:'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200',in_progress:'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200',conducted:'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'}[status]||'bg-muted text-foreground');
