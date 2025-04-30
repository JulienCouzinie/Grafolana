'use client'

import 'react-json-pretty/themes/monikai.css';
import Grafolio from '@/components/grafolio/grafolio';
import { TransactionsProvider } from '../transactions/transactions-provider';

export default function DashboardFeature() {
  return (
    <div className="flex flex-col h-full">
      <TransactionsProvider>
        <Grafolio />
      </TransactionsProvider>
    </div>
  );
}