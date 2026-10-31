'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AnnouncementBar() {
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('NEW ARRIVALS: MONOCHROME ESSENTIALS & WINTER OUTERWEAR');

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'announcement_bar')
          .maybeSingle();

        if (data?.value) {
          if (data.value.enabled !== undefined) setEnabled(data.value.enabled);
          if (data.value.text) setText(data.value.text);
        }
      } catch (e) {
        console.error('Error fetching announcement bar setting:', e);
      }
    }
    fetchAnnouncement();
  }, []);

  if (!enabled) return null;

  return (
    <div className="bg-black text-white text-[10px] md:text-xs py-2 px-4 text-center tracking-widest uppercase font-medium border-b border-neutral-900 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <span>{text}</span>
      </div>
    </div>
  );
}
