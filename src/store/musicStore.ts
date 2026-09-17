/* ===== MusicStore — глобальный стейт музыки (сохраняется при переходах) ===== */
import { create } from 'zustand';

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  genre: string;
  streamUrl: string;
}

interface MusicState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  shuffleOn: boolean;
  repeatOn: boolean;
  likedTracks: Track[];
  isExpanded: boolean;

  setTrack: (track: Track, queue?: Track[], index?: number) => void;
  setPlaying: (v: boolean) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: (track: Track) => void;
  isLiked: (id: string) => boolean;
  setExpanded: (v: boolean) => void;
}

const loadLiked = (): Track[] => {
  try { return JSON.parse(localStorage.getItem('mu_liked_v2') || '[]'); } catch { return []; }
};

export const useMusicStore = create<MusicState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  queue: [],
  queueIndex: 0,
  shuffleOn: false,
  repeatOn: false,
  likedTracks: loadLiked(),
  isExpanded: false,

  setTrack: (track, queue = [], index = 0) => {
    set({ currentTrack: track, queue, queueIndex: index, progress: 0 });
  },
  setPlaying: (v) => set({ isPlaying: v }),
  setProgress: (v) => set({ progress: v }),
  setDuration: (v) => set({ duration: v }),

  nextTrack: () => {
    const { queue, queueIndex, shuffleOn, repeatOn } = get();
    if (!queue.length) return;
    let next: number;
    if (repeatOn) { next = queueIndex; }
    else if (shuffleOn) { next = Math.floor(Math.random() * queue.length); }
    else { next = (queueIndex + 1) % queue.length; }
    set({ currentTrack: queue[next], queueIndex: next, progress: 0 });
  },

  prevTrack: () => {
    const { queue, queueIndex } = get();
    if (!queue.length) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    set({ currentTrack: queue[prev], queueIndex: prev, progress: 0 });
  },

  toggleShuffle: () => set((s) => ({ shuffleOn: !s.shuffleOn })),
  toggleRepeat: () => set((s) => ({ repeatOn: !s.repeatOn })),

  toggleLike: (track) => {
    const liked = get().likedTracks;
    const isLiked = liked.some((t) => t.id === track.id);
    const next = isLiked ? liked.filter((t) => t.id !== track.id) : [track, ...liked];
    try { localStorage.setItem('mu_liked_v2', JSON.stringify(next)); } catch {}
    set({ likedTracks: next });
  },

  isLiked: (id) => get().likedTracks.some((t) => t.id === id),
  setExpanded: (v) => set({ isExpanded: v }),
}));
