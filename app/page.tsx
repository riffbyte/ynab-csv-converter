'use client';

import { AlertCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONSTANTS } from '@/lib/processors/bog/constants';
import { Bank } from '@/lib/processors/types';

export default function UploadPage() {
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('processed.csv');
  const [requestPending, setRequestPending] = useState(false);
  const [bank, setBank] = useState<Bank>(Bank.BOG);
  const [currency, setCurrency] = useState<string>(CONSTANTS.defaultCurrency);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setError(null);
    setRequestPending(true);

    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const name = match?.[1] ?? 'processed.csv';

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setCsvUrl(url);
      setFilename(name);
    } else {
      const error = await res.json();
      setError(error.error);
    }

    setRequestPending(false);
  };

  const handleReset = () => {
    setCsvUrl(null);
    setFilename('processed.csv');
    setRequestPending(false);
  };

  return (
    <main className="flex flex-col w-full h-screen items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold">XLSX to CSV conveter for YNAB</h1>

      {!csvUrl ? (
        <form
          className="flex flex-col w-full max-w-sm items-center gap-6"
          onSubmit={handleUpload}
        >
          <div className="flex flex-col w-full gap-3">
            <Label htmlFor="file">Upload Excel File</Label>
            <Input id="file" type="file" name="file" accept=".xlsx" required />
          </div>

          <div className="flex w-full gap-3">
            <div className="flex flex-col gap-3">
              <Label htmlFor="currency">Currency</Label>
              <Select
                name="currency"
                value={currency}
                onValueChange={setCurrency}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTANTS.availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="currency">Bank</Label>
              <Select
                name="bank"
                value={bank}
                onValueChange={(value) => setBank(value as Bank)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Bank).map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <Button className="w-full" type="submit" disabled={requestPending}>
            {requestPending ? 'Please wait...' : 'Upload & Convert'}
          </Button>
        </form>
      ) : null}

      {csvUrl && (
        <div className="flex flex-col w-full max-w-sm items-center gap-4">
          <h1 className="text-xl font-semibold">Your file is ready!</h1>

          <Button className="w-full max-w-sm" asChild>
            <a href={csvUrl} download={filename}>
              Download "{filename}"
            </a>
          </Button>
          <Button
            className="w-full"
            type="reset"
            variant="outline"
            onClick={handleReset}
          >
            Start over
          </Button>
        </div>
      )}
    </main>
  );
}
