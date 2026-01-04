export function exportToCSV<T>(
  data: T[],
  columns: { key: string | keyof T; header: string; render?: (item: T) => any }[],
  filename: string
) {
  // Create header row
  const headers = columns.map(col => col.header);
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      if (col.render) {
        const rendered = col.render(item);
        // Extract text from React elements or return as string
        if (typeof rendered === 'string') return rendered;
        if (typeof rendered === 'number') return rendered;
        // For React elements, try to extract text content
        return String(rendered).replace(/<[^>]*>/g, '').trim() || '-';
      }
      const value = typeof col.key === 'string' 
        ? (item as any)[col.key]
        : item[col.key as keyof T];
      return value != null ? String(value) : '-';
    });
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

