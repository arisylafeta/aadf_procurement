'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm py-3 px-4 mb-6">
      <div className="container mx-auto">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="AADF Logo" width={32} height={32} className="mr-3" />
            <span className="text-xl font-bold tracking-tight" style={{ color: '#272A5F' }}>AADF</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
