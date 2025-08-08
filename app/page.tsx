'use client';

import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PreviewTable } from '@/components/preview-table';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBankConfig } from '@/lib/processors/bankConfigs';
import { Bank } from '@/lib/processors/types';

export default function UploadPage() {
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('processed.csv');
  const [requestPending, setRequestPending] = useState(false);
  const [bank, setBank] = useState<Bank>(Bank.BOG);
  const {
    availableCurrencies,
    defaultCurrency,
    canConvertMatchingTransactions,
    canTranslate,
  } = getBankConfig(bank);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [error, setError] = useState<string | null>(null);
  const [shouldConvert, setShouldConvert] = useState(false);
  const [shouldTranslate, setShouldTranslate] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

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
      const { csvData, preview, outputFileName } = (await res.json()) as {
        csvData: string;
        preview: string[][];
        outputFileName: string;
      };
      const url = URL.createObjectURL(
        new Blob([csvData], { type: 'text/csv' }),
      );

      setCsvUrl(url);
      setFilename(outputFileName);
      setPreview(preview);
    } else {
      const error = await res.json();
      setError(error.error);
    }

    setRequestPending(false);
  };

  const handleReset = () => {
    setCsvUrl(null);
    setFilename('processed.csv');
    setPreview(null);
    setRequestPending(false);
  };

  return (
    <main className="flex-1 flex flex-col w-full h-full items-center justify-center gap-6 p-16">
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
            <div className="flex flex-1 flex-col gap-3">
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

            <div className="flex flex-1 flex-col gap-3">
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
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canConvertMatchingTransactions && (
            <div className="flex w-full items-center gap-3">
              <Checkbox
                id="shouldConvert"
                name="shouldConvert"
                checked={shouldConvert}
                onCheckedChange={(checked) =>
                  setShouldConvert(
                    checked === 'indeterminate' ? false : checked,
                  )
                }
              />
              <Label htmlFor="shouldConvert">
                Auto-match transactions in other currencies
              </Label>
            </div>
          )}

          {canTranslate && (
            <div className="flex w-full items-center gap-3">
              <Checkbox
                id="shouldTranslate"
                name="shouldTranslate"
                checked={shouldTranslate}
                onCheckedChange={(checked) =>
                  setShouldTranslate(
                    checked === 'indeterminate' ? false : checked,
                  )
                }
              />
              <Label htmlFor="shouldTranslate">
                <span>Auto-translate payee information</span>
                <Badge variant="outline">Experimental</Badge>
              </Label>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <Button className="w-full" type="submit" disabled={requestPending}>
            {requestPending && <Loader2Icon className="animate-spin" />}
            {requestPending ? 'Please wait...' : 'Upload & Convert'}
          </Button>
        </form>
      ) : null}

      {csvUrl && (
        <div className="flex flex-col w-full items-center gap-4">
          <h1 className="text-xl font-semibold max-w-sm">
            Your file is ready!
          </h1>

          {preview && <PreviewTable preview={preview} />}

          <div className="flex flex-col w-full max-w-sm items-center gap-4">
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
        </div>
      )}
    </main>
  );
}
