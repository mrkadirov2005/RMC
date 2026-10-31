import { AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MediaFile } from '../api/types';
import { Button } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { mediaLink, uploadFile } from '../lib/upload';
import { colors, radius, space } from '../theme/tokens';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Opens one of the student's files through a fresh signed link.
const openMedia = async (mediaId: number) => {
  const { url } = await mediaLink(mediaId);
  await Linking.openURL(url);
};

type Pending = { uri: string; contentType: string; name: string | null } | null;

// Keeps a failed upload so the student can retry it without recording or picking again.
function useUploader(onDone: (media: MediaFile) => void) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Pending>(null);
  const start = async (file: NonNullable<Pending>) => {
    pending.current = file;
    setState('busy');
    setError(null);
    try {
      const media = await uploadFile(file);
      pending.current = null;
      setState('idle');
      onDone(media);
    } catch (e) {
      setState('failed');
      setError(e instanceof Error && e.message !== 'NETWORK' ? e.message : null);
    }
  };
  const retry = () => (pending.current ? start(pending.current) : undefined);
  return { state, error, start, retry };
}

// @MOB-143 Record a spoken answer (up to max_seconds), listen to it, record again. The recording
// is uploaded as soon as it stops; the answer holds its media id.
export function AudioAnswer({
  value,
  onChange,
  readOnly,
  maxSeconds,
  media,
  canOpen,
}: {
  value: number | undefined;
  onChange: (mediaId: number | null) => void;
  readOnly: boolean;
  maxSeconds: number;
  media: MediaFile[];
  canOpen: boolean;
}) {
  const { t } = useT();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder, 250);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const uploader = useUploader((m) => onChange(m.media_id));
  const seconds = (recording.durationMillis || 0) / 1000;
  const saved = media.find((m) => m.media_id === value);

  const stop = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) return;
    setLocalUri(uri);
    const contentType = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
    void uploader.start({ uri, contentType, name: `answer.${Platform.OS === 'web' ? 'webm' : 'm4a'}` });
  };

  useEffect(() => {
    if (recording.isRecording && seconds >= maxSeconds) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.isRecording, seconds, maxSeconds]);

  const record = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setDenied(true);
      return;
    }
    setDenied(false);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const play = async () => {
    const uri = localUri ?? (value ? (await mediaLink(value)).url : null);
    if (!uri) return;
    const player = createAudioPlayer({ uri });
    player.play();
  };

  const hasAnswer = value != null;
  return (
    <View style={{ gap: space.sm }}>
      {recording.isRecording ? (
        <View style={styles.recRow}>
          <View style={styles.dot} />
          <Text style={styles.recText}>
            {clock(seconds)} / {clock(maxSeconds)}
          </Text>
          <View style={{ flex: 1 }} />
          <Button title={t.stopRecording} variant="danger" onPress={() => void stop()} />
        </View>
      ) : (
        <>
          {hasAnswer ? (
            <View style={styles.fileRow}>
              <Text style={{ fontSize: 18 }}>🎤</Text>
              <Text style={[styles.fileName, { flex: 1 }]}>
                {t.audioAnswer}
                {saved ? ` · ${sizeLabel(saved.size_bytes)}` : ''}
              </Text>
              {canOpen || localUri ? (
                <Pressable onPress={() => void play()} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.link}>▶ {t.listen}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : readOnly ? (
            <Text style={styles.muted}>{t.noAnswer}</Text>
          ) : null}
          {!readOnly && uploader.state !== 'busy' ? (
            <Button title={hasAnswer ? t.recordAgain : `🎤 ${t.record}`} variant={hasAnswer ? 'secondary' : 'primary'} onPress={() => void record()} />
          ) : null}
        </>
      )}
      {uploader.state === 'busy' ? <Text style={styles.muted}>{t.uploading}</Text> : null}
      {uploader.state === 'failed' ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.error}>{uploader.error || t.uploadFailed}</Text>
          <Button title={t.retryUpload} variant="secondary" onPress={() => void uploader.retry()} />
        </View>
      ) : null}
      {denied ? <Text style={styles.error}>{t.micDenied}</Text> : null}
    </View>
  );
}

// @MOB-143 Attach photos (camera or gallery) or PDFs, up to max_files. Each is uploaded at once.
export function FileAnswer({
  value,
  onChange,
  readOnly,
  maxFiles,
  media,
  canOpen,
}: {
  value: number[] | undefined;
  onChange: (ids: number[]) => void;
  readOnly: boolean;
  maxFiles: number;
  media: MediaFile[];
  canOpen: boolean;
}) {
  const { t } = useT();
  const ids = Array.isArray(value) ? value : [];
  const [known, setKnown] = useState<MediaFile[]>(media);
  const uploader = useUploader((m) => {
    setKnown((list) => [...list, m]);
    onChange([...ids, m.media_id]);
  });

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) void uploader.start({ uri: asset.uri, contentType: asset.mimeType || 'image/jpeg', name: asset.fileName ?? 'photo.jpg' });
  };
  const fromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) void uploader.start({ uri: asset.uri, contentType: asset.mimeType || 'image/jpeg', name: asset.fileName ?? 'photo.jpg' });
  };
  const pdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) void uploader.start({ uri: asset.uri, contentType: 'application/pdf', name: asset.name });
  };

  const full = ids.length >= maxFiles;
  return (
    <View style={{ gap: space.sm }}>
      {ids.map((id) => {
        const file = known.find((m) => m.media_id === id);
        return (
          <View key={id} style={styles.fileRow}>
            <Text style={{ fontSize: 18 }}>{file?.kind === 'pdf' ? '📄' : '🖼️'}</Text>
            <Pressable style={{ flex: 1 }} disabled={!canOpen} onPress={() => void openMedia(id)} accessibilityRole="link">
              <Text style={[styles.fileName, canOpen && { color: colors.primary }]} numberOfLines={1}>
                {file?.file_name || t.attachment}
              </Text>
              {file ? <Text style={styles.muted}>{sizeLabel(file.size_bytes)}</Text> : null}
            </Pressable>
            {!readOnly ? (
              <Pressable onPress={() => onChange(ids.filter((x) => x !== id))} accessibilityRole="button" accessibilityLabel={t.removeFile} hitSlop={8}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {readOnly && ids.length === 0 ? <Text style={styles.muted}>{t.noAnswer}</Text> : null}
      {!readOnly && !full && uploader.state !== 'busy' ? (
        <View style={styles.pickRow}>
          {Platform.OS !== 'web' ? <PickButton label={`📷 ${t.camera}`} onPress={fromCamera} /> : null}
          <PickButton label={`🖼️ ${t.gallery}`} onPress={fromGallery} />
          <PickButton label="📄 PDF" onPress={pdf} />
        </View>
      ) : null}
      {!readOnly ? <Text style={styles.muted}>{t.filesLeft(Math.max(0, maxFiles - ids.length), maxFiles)}</Text> : null}
      {uploader.state === 'busy' ? <Text style={styles.muted}>{t.uploading}</Text> : null}
      {uploader.state === 'failed' ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.error}>{uploader.error || t.uploadFailed}</Text>
          <Button title={t.retryUpload} variant="secondary" onPress={() => void uploader.retry()} />
        </View>
      ) : null}
    </View>
  );
}

function PickButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pick} accessibilityRole="button">
      <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recText: { fontVariant: ['tabular-nums'], fontWeight: '700', color: colors.text },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 },
  fileName: { color: colors.text, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700' },
  remove: { color: colors.muted, fontSize: 16, paddingHorizontal: 4 },
  muted: { color: colors.muted, fontSize: 12.5 },
  error: { color: colors.danger, fontSize: 13 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pick: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
