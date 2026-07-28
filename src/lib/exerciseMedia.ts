import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

export interface ExerciseMedia {
  exerciseName: string;
  mediaUrls: string[];
  tips: string[];
  sourceName: string;
  sourceUrl: string;
  sourceLicense: string;
}

interface ExerciseMediaRow {
  exercise_name: string;
  media_urls: string[];
  tips: string[];
  source_name: string;
  source_url: string;
  source_license: string;
}

function fromRow(row: ExerciseMediaRow): ExerciseMedia {
  return {
    exerciseName: row.exercise_name,
    mediaUrls: row.media_urls,
    tips: row.tips,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceLicense: row.source_license,
  };
}

/**
 * Demonstration media + form cues for one exercise, matched by exact name
 * against the `exercise_media` table (imported once via migration
 * 0007_exercise_media.sql — see that file for the source/licensing
 * rationale, not fetched live from any third party here). `null` when the
 * exercise has no curated entry — the caller shows a plain fallback, never
 * a crash or a mismatched demonstration. Cached like the rest of the app's
 * read layer so a repeat visit doesn't re-hit the network.
 */
export async function fetchExerciseMedia(exerciseName: string): Promise<ExerciseMedia | null> {
  return fetchWithCache(`exercise_media:${exerciseName}`, async () => {
    const { data, error } = await supabase.from('exercise_media').select('*').eq('exercise_name', exerciseName).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ExerciseMediaRow) : null;
  });
}
