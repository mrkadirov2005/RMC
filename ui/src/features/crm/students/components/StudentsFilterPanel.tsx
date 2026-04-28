// Source file for the students area in the crm feature.

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option { id?: number; label: string; value: string | number }
interface Props { open: boolean; gender: string; status: string; onGender: (value: string) => void; onStatus: (value: string) => void; genderOptions: Option[]; statusOptions: Option[]; }

// Renders the students filter panel module.
export const StudentsFilterPanel = ({ open, gender, status, onGender, onStatus, genderOptions, statusOptions }: Props) => !open ? null : (
  <Card className="mb-5"><CardContent className="py-4"><div className="flex flex-wrap gap-4"><div className="min-w-[150px]"><Label className="text-xs font-semibold mb-1.5 block">Gender</Label><Select value={gender || 'all'} onValueChange={(v) => onGender(v === 'all' ? '' : v)}><SelectTrigger><SelectValue placeholder="All Genders" /></SelectTrigger><SelectContent><SelectItem value="all">All Genders</SelectItem>{genderOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select></div><div className="min-w-[150px]"><Label className="text-xs font-semibold mb-1.5 block">Status</Label><Select value={status || 'all'} onValueChange={(v) => onStatus(v === 'all' ? '' : v)}><SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{statusOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select></div></div></CardContent></Card>
);

