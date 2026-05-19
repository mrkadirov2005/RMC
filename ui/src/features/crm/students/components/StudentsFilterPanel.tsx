// Source file for the students area in the crm feature.

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option { id?: number; label: string; value: string | number }
interface Props {
  open: boolean;
  gender: string;
  status: string;
  school: string;
  classId: string;
  subjectId: string;
  level: string;
  address: string;
  age: string;
  onGender: (value: string) => void;
  onStatus: (value: string) => void;
  onSchool: (value: string) => void;
  onClassId: (value: string) => void;
  onSubjectId: (value: string) => void;
  onLevel: (value: string) => void;
  onAddress: (value: string) => void;
  onAge: (value: string) => void;
  genderOptions: Option[];
  statusOptions: Option[];
  schoolOptions: string[];
  classOptions: Option[];
  subjectOptions: Option[];
  levelOptions: Array<string | number>;
  addressOptions: string[];
}

const normalizeValue = (value: string) => value === 'all' ? '' : value;

// Renders the students filter panel module.
export const StudentsFilterPanel = ({
  open,
  gender,
  status,
  school,
  classId,
  subjectId,
  level,
  address,
  age,
  onGender,
  onStatus,
  onSchool,
  onClassId,
  onSubjectId,
  onLevel,
  onAddress,
  onAge,
  genderOptions,
  statusOptions,
  schoolOptions,
  classOptions,
  subjectOptions,
  levelOptions,
  addressOptions,
}: Props) => !open ? null : (
  <Card className="mb-5 overflow-hidden border-cyan-100 bg-gradient-to-br from-white via-cyan-50/50 to-amber-50/35 shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
    <div className="h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-400 dark:hidden" />
    <CardContent className="py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Maktab</Label>
          <Select value={school || 'all'} onValueChange={(v) => onSchool(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma maktablar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma maktablar</SelectItem>
              {schoolOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Sinf</Label>
          <Select value={classId || 'all'} onValueChange={(v) => onClassId(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma sinflar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma sinflar</SelectItem>
              <SelectItem value="-1">Sinf biriktirilmagan</SelectItem>
              {classOptions.map((opt) => <SelectItem key={opt.id || opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Fan</Label>
          <Select value={subjectId || 'all'} onValueChange={(v) => onSubjectId(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma fanlar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma fanlar</SelectItem>
              {subjectOptions.map((opt) => <SelectItem key={opt.id || opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Daraja</Label>
          <Select value={level || 'all'} onValueChange={(v) => onLevel(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma darajalar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma darajalar</SelectItem>
              {levelOptions.map((item) => <SelectItem key={item} value={String(item)}>Level {item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Manzil</Label>
          <Select value={address || 'all'} onValueChange={(v) => onAddress(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma manzillar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma manzillar</SelectItem>
              {addressOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Yosh</Label>
          <Select value={age || 'all'} onValueChange={(v) => onAge(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="Hamma yoshlar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamma yoshlar</SelectItem>
              {Array.from({ length: 18 }, (_, index) => index + 5).map((item) => (
                <SelectItem key={item} value={String(item)}>{item} yosh</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Gender</Label>
          <Select value={gender || 'all'} onValueChange={(v) => onGender(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="All Genders" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              {genderOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold">Status</Label>
          <Select value={status || 'all'} onValueChange={(v) => onStatus(normalizeValue(v))}>
            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
);
