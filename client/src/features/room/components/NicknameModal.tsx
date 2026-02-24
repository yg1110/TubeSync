import { useState } from "react";
import { motion } from "motion/react";
import { Play, AlertCircle } from "lucide-react";
import type { JoinRejectedReason } from "../types";

function reasonToMessage(reason: JoinRejectedReason) {
  if (reason === "NICKNAME_TAKEN") return "이미 사용 중인 닉네임입니다.";
  return "닉네임은 2~12자, 한글/영문/숫자/공백만 가능합니다.";
}

export function NicknameModal(props: {
  open: boolean;
  onSubmit: (nickname: string) => void;
  error: JoinRejectedReason | null;
}) {
  const [nickname, setNickname] = useState("");

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#151619] p-8 rounded-2xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Play className="text-white w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            TubeSync
          </h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (nickname.trim()) props.onSubmit(nickname);
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              닉네임 입력 (2~12자, 한글/영문/숫자/공백)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. MusicLover"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/50 transition-colors"
              autoFocus
            />
            {props.error && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> {reasonToMessage(props.error)}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20"
          >
            입장
          </button>
        </form>
      </motion.div>
    </div>
  );
}
