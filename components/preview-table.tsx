import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function PreviewTable({ preview }: { preview: string[][] }) {
  const headerRow = preview[0];
  const dataRows = preview.slice(1);

  return (
    <div className="flex flex-col w-full items-center gap-4 mb-8">
      <h3 className="text-md">
        Here's the preview of last {dataRows.length} lines from your file:
      </h3>
      <div className="overflow-hidden rounded-md border w-full max-w-3xl">
        <div
          data-slot="table-container"
          className="relative w-full overflow-x-auto"
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                {headerRow.map((cell, index) => (
                  <TableHead
                    key={cell}
                    className={cn({
                      'w-[100px]': index === 0,
                      'w-[150px]': index === 1,
                      'min-w-[200px]': index === 2,
                      'w-[100px] text-right': index === 3,
                    })}
                  >
                    {cell}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataRows.map((row) => (
                <TableRow key={row.join('-')}>
                  {row.map((cell, index) => (
                    <TableCell
                      key={cell}
                      className={cn({
                        'w-[80px]': index === 0,
                        'w-[120px]': index === 1,
                        'min-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap':
                          index === 2,
                        'w-[100px] text-right': index === 3,
                      })}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
