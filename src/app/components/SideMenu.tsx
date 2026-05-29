import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Close,
  Notifications,
  ChevronRight,
  Person,
  Campaign,
  HelpOutline,
  MailOutline,
  InfoOutlined,
} from '@mui/icons-material';

export type SideMenuKey = 'profile' | 'notices' | 'help' | 'contact' | 'about';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (key: SideMenuKey) => void;
  onNotifications?: () => void;
  appVersion?: string;
}

interface MenuItem {
  key: SideMenuKey;
  label: string;
  Icon: typeof Person;
}

const ITEMS: MenuItem[] = [
  { key: 'profile',  label: '나의 정보',   Icon: Person },
  { key: 'notices',  label: '공지사항',    Icon: Campaign },
  { key: 'help',     label: '서비스 안내', Icon: HelpOutline },
  { key: 'contact',  label: '문의하기',    Icon: MailOutline },
  { key: 'about',    label: '앱 정보',     Icon: InfoOutlined },
];

export function SideMenu({
  open,
  onClose,
  onSelect,
  onNotifications,
  appVersion = '1.0.0',
}: SideMenuProps) {
  // Lock body scroll while the drawer is open, and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="메뉴 닫기"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30"
          />

          {/* Drawer */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="메뉴"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="absolute top-0 right-0 h-full w-[78%] max-w-[340px] bg-white shadow-2xl flex flex-col"
          >
            {/* Top bar — bell + close */}
            <div className="flex items-center justify-end gap-1 px-3 pt-3 pb-2">
              <button
                type="button"
                onClick={onNotifications}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 active:bg-gray-100 transition"
                aria-label="알림"
              >
                <Notifications />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 active:bg-gray-100 transition"
                aria-label="메뉴 닫기"
              >
                <Close />
              </button>
            </div>

            {/* Items */}
            <nav className="flex-1 overflow-y-auto px-2 pt-2">
              <ul className="flex flex-col">
                {ITEMS.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => onSelect(key)}
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left active:bg-[#EAF4F0] transition"
                    >
                      <Icon sx={{ fontSize: 22 }} className="text-gray-900 shrink-0" />
                      <span className="flex-1 text-[16px] font-bold text-[#14322E]">
                        {label}
                      </span>
                      <ChevronRight sx={{ fontSize: 20 }} className="text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer — version */}
            <div className="px-5 pb-5 pt-2 text-right">
              <span className="text-[11px] text-gray-400">Ver. {appVersion}</span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
