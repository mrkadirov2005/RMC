// A room itself: the extra name, how many it seats, what equipment it has, when it is open and
// whether it can be used. Lessons in the room are handled by the assignment dialog.
import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { roomAPI } from '../api';
import type { PhysicalRoom } from '../hooks/useRoomsOverview';

const SUGGESTED_EQUIPMENT = ['TV', 'Speaker', 'Air conditioner', 'Projector', 'Whiteboard', 'Wi-Fi'];
const STATUSES = [
  { value: 'active', label: 'In use' },
  { value: 'maintenance', label: 'Under repair' },
  { value: 'inactive', label: 'Not in use' },
];

const hhmm = (value?: string | null) => String(value || '').slice(0, 5);

type Props = { room: PhysicalRoom | null; onClose: () => void; onSaved: () => void };

export const RoomDetailsDialog = ({ room, onClose, onSaved }: Props) => (
  // Keyed by room so the form starts from that room each time it opens.
  <Dialog open={room !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    {room && <RoomDetailsForm key={room.room_id} room={room} onClose={onClose} onSaved={onSaved} />}
  </Dialog>
);

const RoomDetailsForm = ({ room, onClose, onSaved }: { room: PhysicalRoom; onClose: () => void; onSaved: () => void }) => {
  const { t } = useLanguage();
  const [nickname, setNickname] = useState(room.nickname || '');
  const [capacity, setCapacity] = useState(room.capacity ? String(room.capacity) : '');
  const [features, setFeatures] = useState<string[]>(Array.isArray(room.features) ? room.features : []);
  const [draft, setDraft] = useState('');
  const [opens, setOpens] = useState(hhmm(room.operating_start_time) || '08:00');
  const [closes, setCloses] = useState(hhmm(room.operating_end_time) || '21:00');
  const [status, setStatus] = useState(room.status || 'active');
  const [saving, setSaving] = useState(false);

  const addFeature = (value: string) => {
    const text = value.trim();
    if (!text || features.some((item) => item.toLowerCase() === text.toLowerCase())) return;
    setFeatures([...features, text]);
    setDraft('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (closes <= opens) return showToast.error(t('The room must close after it opens'));
    if (capacity && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) return showToast.error(t('Capacity must be a whole number'));
    setSaving(true);
    try {
      await roomAPI.updatePhysical(room.room_id, {
        nickname: nickname.trim(),
        ...(capacity ? { capacity: Number(capacity) } : {}),
        // The pending text counts too, so a typed item is not lost by pressing Save.
        features: draft.trim() && !features.some((item) => item.toLowerCase() === draft.trim().toLowerCase()) ? [...features, draft.trim()] : features,
        operating_start_time: opens,
        operating_end_time: closes,
        status,
      });
      showToast.success(t('Room saved'));
      onSaved();
      onClose();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't save the room"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{t('Room {room}', { room: room.name })}</DialogTitle>
        <DialogDescription>{t('The extra name, seats, equipment and opening hours.')}</DialogDescription>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4" data-testid="room-details-form">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="room-nickname">{t('Extra name (in brackets)')}</Label>
            <Input id="room-nickname" value={nickname} maxLength={100} placeholder={t('e.g. Big hall')} onChange={(event) => setNickname(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="room-capacity">{t('Room capacity')}</Label>
            <Input id="room-capacity" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder={t('Optional')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="room-equipment">{t('Equipment')}</Label>
          <div className="flex flex-wrap gap-1.5" aria-label={t('Equipment in this room')}>
            {features.length === 0 && <span className="text-sm text-muted-foreground">{t('Nothing listed yet.')}</span>}
            {features.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-sm">
                {item}
                <button type="button" aria-label={t('Remove {item}', { item })} onClick={() => setFeatures(features.filter((own) => own !== item))}
                  className="rounded-full text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input id="room-equipment" value={draft} maxLength={60} placeholder={t('Add equipment, e.g. TV')} onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFeature(draft); } }} />
            <Button type="button" variant="outline" onClick={() => addFeature(draft)} disabled={!draft.trim()}>
              <Plus className="mr-1 h-4 w-4" /> {t('Add')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_EQUIPMENT.filter((item) => !features.some((own) => own.toLowerCase() === t(item).toLowerCase())).map((item) => (
              <button key={item} type="button" onClick={() => addFeature(t(item))} className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                + {t(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="room-opens">{t('Opens')}</Label>
            <Input id="room-opens" type="time" required value={opens} onChange={(event) => setOpens(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="room-closes">{t('Closes')}</Label>
            <Input id="room-closes" type="time" required value={closes} onChange={(event) => setCloses(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="room-status">{t('Status')}</Label>
            <select id="room-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {STATUSES.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}
            </select>
          </div>
        </div>
        {status !== 'active' && <p className="text-xs text-amber-700 dark:text-amber-400">{t('A room that is not in use is left out of the timetable and the free-room search.')}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('Save')}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};
