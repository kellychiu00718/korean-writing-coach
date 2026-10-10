"use client";

import { useRef } from "react";

/** 登出前先跳出確認視窗；用原生 <dialog>，Esc 可以關、焦點會留在視窗裡。 */
export function SignOutButton() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex min-h-11 items-center shrink-0 rounded-full px-2 text-[13px] whitespace-nowrap text-ink-soft hover:bg-peach min-[380px]:px-2.5 min-[380px]:text-sm sm:px-3"
      >
        登出
      </button>
      <dialog
        ref={ref}
        aria-labelledby="signout-title"
        onClick={(e) => {
          // 點視窗外面的灰色區域也能關掉
          if (e.target === e.currentTarget) ref.current?.close();
        }}
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-[28px] border-2 border-ink bg-white p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="grid gap-4 p-6">
          <h2 id="signout-title" className="text-xl font-bold">
            確定要登出嗎？
          </h2>
          <p className="text-sm text-ink-soft">
            你寫過的句子和進度都會保留，下次用同一個信箱登入就能接著練習。
          </p>
          <form
            action="/auth/signout"
            method="post"
            className="flex flex-wrap justify-end gap-3"
          >
            <button
              type="button"
              autoFocus
              className="btn btn-ghost btn-sm"
              onClick={() => ref.current?.close()}
            >
              先不要
            </button>
            <button type="submit" className="btn btn-sm">
              確定登出
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
