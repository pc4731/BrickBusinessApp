'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerStatementView } from '@/components/customer-statement';

export default function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Customer Statement</h1>
      </div>
      <CustomerStatementView customerId={id} />
    </div>
  );
}
