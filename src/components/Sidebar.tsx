"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/candidates", label: "Ứng viên" },
  { href: "/jobs", label: "Tin tuyển dụng" },
];

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <p className="font-semibold text-slate-900">Tuyển dụng CV</p>
        <p className="text-xs text-slate-500">Công cụ nội bộ</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-200">
        <p className="px-3 text-sm text-slate-500 mb-2 truncate">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
