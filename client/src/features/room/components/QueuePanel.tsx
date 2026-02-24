import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListMusic, Plus } from "lucide-react";
import type { QueueAddRejectedReason, QueueItem } from "../types";

function errorMessage(e: QueueAddRejectedReason) {
  return e === "INVALID_URL"
    ? "유효한 유튜브 링크가 아닙니다."
    : "큐 추가 실패";
}

export function QueuePanel(props: {
  queue: QueueItem[];
  onAdd: (url: string) => void;
  error: QueueAddRejectedReason | null;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    props.onAdd(v);
    setUrl("");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic size={18} className="text-red-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Up Next
          </h2>
        </div>
        <span className="text-xs text-gray-500">
          {props.queue.length} videos in queue
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here..."
          className="flex-1 bg-[#151619] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600/50 transition-colors"
        />
        <button
          type="submit"
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
        >
          <Plus size={18} />
          <span className="text-sm font-semibold">Add</span>
        </button>
      </form>

      {props.error && (
        <p className="text-red-500 text-xs">{errorMessage(props.error)}</p>
      )}

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {props.queue.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-4 bg-[#151619]/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group"
            >
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-xs font-mono text-gray-600 shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm text-gray-300 truncate group-hover:text-white transition-colors font-mono">
                  {video.videoId}
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5 tracking-tighter">
                  Added by {video.addedBy}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {props.queue.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-600 italic">
            The queue is empty.
          </p>
        )}
      </div>
    </section>
  );
}
