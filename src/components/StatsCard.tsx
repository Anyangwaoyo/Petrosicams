/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  description?: string;
  change?: string;
}

export default function StatsCard({ title, value, icon, color = "bg-indigo-50 text-indigo-700", description, change }: StatsCardProps) {
  const displayDesc = change || description;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center justify-between">
      <div>
        <span className="text-gray-400 font-bold text-xxs uppercase tracking-wider block">{title}</span>
        <span className="text-2xl font-black text-gray-800 mt-1 block">{value}</span>
        {displayDesc && <span className="text-xxs text-gray-400 font-semibold mt-1 block">{displayDesc}</span>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  );
}
