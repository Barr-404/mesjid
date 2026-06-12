import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import pool from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

async function generateTabunganQurbanPDF(user: any) {
  const client = await pool.connect();
  
  try {
    // Check if user_id column exists first
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tabungan_qurban' 
      AND column_name = 'user_id'
    `);
    
    const hasUserIdColumn = columnCheck.rows.length > 0;
    const userFilter = hasUserIdColumn ? 'WHERE tq.user_id = $1' : '';
    const queryParams = hasUserIdColumn ? [user.userId] : [];

    // Get tabungan qurban data
    const tabunganResult = await client.query(`
      SELECT 
        tq.nama_penabung,
        tq.alamat,
        tq.total_terkumpul,
        tq.target_tabungan,
        tq.jenis_hewan,
        tq.status,
        COUNT(cq.id) as total_transaksi,
        COALESCE(SUM(cq.jumlah), 0) as total_setor
      FROM tabungan_qurban tq
      LEFT JOIN cicilan_qurban cq ON cq.tabungan_id = tq.id
      ${userFilter}
      GROUP BY tq.id, tq.nama_penabung, tq.alamat, tq.total_terkumpul, tq.target_tabungan, tq.jenis_hewan, tq.status
      ORDER BY tq.nama_penabung ASC
    `, queryParams);

    // Get summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(DISTINCT tq.id) as total_penabung,
        COUNT(cq.id) as total_transaksi,
        COALESCE(SUM(cq.jumlah), 0) as total_setor,
        COALESCE(SUM(tq.total_terkumpul), 0) as total_saldo
      FROM tabungan_qurban tq
      LEFT JOIN cicilan_qurban cq ON cq.tabungan_id = tq.id
      ${userFilter}
    `, queryParams);

    const summary = summaryResult.rows[0];
    const tabunganData = tabunganResult.rows;

    // Create PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.text('LAPORAN TABUNGAN QURBAN', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Masjid Muhammadiyah', 105, 30, { align: 'center' });
    doc.text(`Tanggal Cetak: ${formatDate(new Date().toISOString())}`, 105, 40, { align: 'center' });

    let y = 55;

    // Summary
    doc.setFontSize(12);
    doc.text('RINGKASAN:', 25, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Total Penabung: ${summary.total_penabung}`, 30, y);
    y += 8;
    doc.text(`Total Transaksi: ${summary.total_transaksi}`, 30, y);
    y += 8;
    doc.text(`Total Setoran: ${formatCurrency(parseFloat(summary.total_setor))}`, 30, y);
    y += 8;
    doc.text(`Total Saldo: ${formatCurrency(parseFloat(summary.total_saldo))}`, 30, y);
    y += 15;

    // Table header
    doc.setFontSize(12);
    doc.text('DETAIL PENABUNG:', 25, y);
    y += 10;

    // Create table
    const headers = ['No', 'Nama Penabung', 'Alamat', 'Total Setor', 'Target', 'Progress'];
    const columnWidths = [15, 40, 40, 30, 30, 25];
    let x = 25;

    // Draw table headers
    doc.setFontSize(9);
    for (let i = 0; i < headers.length; i++) {
      doc.rect(x, y, columnWidths[i], 8);
      doc.text(headers[i], x + 2, y + 6);
      x += columnWidths[i];
    }
    y += 8;

    // Draw table rows
    tabunganData.forEach((row, index) => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }

      x = 25;
      const values = [
        (index + 1).toString(),
        row.nama_penabung,
        row.alamat || '-',
        formatCurrency(parseFloat(row.total_setor)),
        formatCurrency(parseFloat(row.target_tabungan)),
        `${Math.round((parseFloat(row.total_terkumpul) / parseFloat(row.target_tabungan)) * 100)}%`
      ];

      for (let i = 0; i < values.length; i++) {
        doc.rect(x, y, columnWidths[i], 8);
        const text = values[i] || '-';
        const textWidth = doc.getTextWidth(text);
        const textX = i === 0 ? x + (columnWidths[i] - textWidth) / 2 : x + 2;
        doc.text(text, textX, y + 6);
        x += columnWidths[i];
      }
      y += 8;
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-tabungan-qurban.pdf"`,
      },
    });

  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get('jenis');
    
    if (jenis === 'tabungan-qurban') {
      return generateTabunganQurbanPDF(user);
    }

    const dari = searchParams.get('dari') || '2024-01-01';
    const sampai = searchParams.get('sampai') || new Date().toISOString().split('T')[0];

    const client = await pool.connect();

    try {
      // Get detailed financial data
      const queries = await Promise.all([
        // Saldo sebelumnya
        client.query(`
          SELECT COALESCE(saldo_sesudah, 0) as saldo
          FROM kas_harian
          WHERE user_id = $1 AND tanggal < $2
          ORDER BY tanggal DESC, created_at DESC
          LIMIT 1
        `, [user.userId, dari]),
        
        // Kas masuk berdasarkan kategori
        client.query(`
          SELECT kategori, SUM(jumlah) as total
          FROM kas_harian 
          WHERE user_id = $1 AND tanggal BETWEEN $2 AND $3 AND jenis_transaksi = 'masuk'
          GROUP BY kategori
          ORDER BY total DESC
        `, [user.userId, dari, sampai]),
        
        // Zakat Fitrah
        client.query(`
          SELECT COALESCE(SUM(total_rupiah), 0) as total
          FROM zakat_fitrah 
          WHERE user_id = $1 AND tanggal_bayar BETWEEN $2 AND $3
        `, [user.userId, dari, sampai]),
        
        // Zakat Mal
        client.query(`
          SELECT COALESCE(SUM(jumlah_zakat), 0) as total
          FROM zakat_mal 
          WHERE user_id = $1 AND tanggal_bayar BETWEEN $2 AND $3
        `, [user.userId, dari, sampai]),
        
        // Donatur Bulanan - PERBAIKAN QUERY
        client.query(`
          SELECT COALESCE(SUM(pd.jumlah), 0) as total
          FROM pembayaran_donatur pd
          JOIN donatur_bulanan db ON pd.donatur_id = db.id
          WHERE db.user_id = $1 AND pd.tanggal_bayar BETWEEN $2 AND $3
        `, [user.userId, dari, sampai]),
        
        // Tabungan Qurban
        client.query(`
          SELECT COALESCE(SUM(cq.jumlah), 0) as total
          FROM cicilan_qurban cq
          JOIN tabungan_qurban tq ON cq.tabungan_id = tq.id
          WHERE tq.user_id = $1 AND cq.tanggal_bayar BETWEEN $2 AND $3
        `, [user.userId, dari, sampai]),
        
        // Pengeluaran berdasarkan kategori
        client.query(`
          SELECT kategori, SUM(jumlah) as total
          FROM pengeluaran 
          WHERE user_id = $1 AND tanggal BETWEEN $2 AND $3
          GROUP BY kategori
          ORDER BY total DESC
        `, [user.userId, dari, sampai]),
        
        // Kas keluar berdasarkan kategori
        client.query(`
          SELECT kategori, SUM(jumlah) as total
          FROM kas_harian 
          WHERE user_id = $1 AND tanggal BETWEEN $2 AND $3 AND jenis_transaksi = 'keluar'
          GROUP BY kategori
          ORDER BY total DESC
        `, [user.userId, dari, sampai]),
        
        // Saldo akhir
        client.query(`
          SELECT COALESCE(saldo_sesudah, 0) as saldo
          FROM kas_harian
          WHERE user_id = $1 AND tanggal <= $2
          ORDER BY tanggal DESC, created_at DESC
          LIMIT 1
        `, [user.userId, sampai])
      ]);

      const [saldoSebelumResult, kasMasukResult, zakatFitrahResult, zakatMalResult, 
             donaturResult, tabunganResult, pengeluaranResult, kasKeluarResult, saldoAkhirResult] = queries;

      const saldoSebelum = saldoSebelumResult.rows[0]?.saldo || 0;
      const kasMasuk = kasMasukResult.rows;
      const zakatFitrah = zakatFitrahResult.rows[0]?.total || 0;
      const zakatMal = zakatMalResult.rows[0]?.total || 0;
      const donatur = donaturResult.rows[0]?.total || 0;
      const tabungan = tabunganResult.rows[0]?.total || 0;
      const pengeluaranKategori = pengeluaranResult.rows;
      const kasKeluarKategori = kasKeluarResult.rows;
      const saldoAkhir = saldoAkhirResult.rows[0]?.saldo || 0;

      // Create PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper functions
      const formatRupiah = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };

      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      // Header sederhana
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN KEUANGAN MASJID', 105, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periode: ${formatDate(dari)} s/d ${formatDate(sampai)}`, 105, 35, { align: 'center' });
      
      // Garis bawah header
      doc.setDrawColor(0, 0, 0);
      doc.line(20, 42, 190, 42);

      let y = 55;

      // PEMASUKAN Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PEMASUKAN', 20, y);
      y += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      let counter = 1;
      let totalPemasukan = 0;
      
      // Kas masuk per kategori (dari kas_harian)
      kasMasuk.forEach(item => {
        const kategori = item.kategori.toUpperCase().replace(/_/g, ' ');
        const total = parseFloat(item.total);
        doc.text(`${counter}. KAS ${kategori}`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(total), 170, y, { align: 'right' });
        totalPemasukan += total;
        y += 8;
        counter++;
      });
      
      // Zakat Fitrah (dari tabel zakat_fitrah - tidak ada di kas_harian)
      if (zakatFitrah > 0) {
        doc.text(`${counter}. ZAKAT FITRAH`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(zakatFitrah), 170, y, { align: 'right' });
        totalPemasukan += parseFloat(String(zakatFitrah));
        y += 8;
        counter++;
      }
      
      // Zakat Mal (dari tabel zakat_mal - tidak ada di kas_harian)
      if (zakatMal > 0) {
        doc.text(`${counter}. ZAKAT MAL`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(zakatMal), 170, y, { align: 'right' });
        totalPemasukan += parseFloat(String(zakatMal));
        y += 8;
        counter++;
      }
      
      // Donatur Bulanan (dari pembayaran_donatur - tidak ada di kas_harian)
      if (donatur > 0) {
        doc.text(`${counter}. DONATUR BULANAN`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(donatur), 170, y, { align: 'right' });
        totalPemasukan += parseFloat(String(donatur));
        y += 8;
        counter++;
      }
      
      // Tabungan Qurban (dari cicilan_qurban - tidak ada di kas_harian)
      if (tabungan > 0) {
        doc.text(`${counter}. TABUNGAN QURBAN`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(tabungan), 170, y, { align: 'right' });
        totalPemasukan += parseFloat(String(tabungan));
        y += 8;
        counter++;
      }

      // Jika tidak ada data pemasukan
      if (totalPemasukan === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Tidak ada pemasukan pada periode ini', 25, y);
        y += 8;
      }

      // Total Pemasukan
      y += 3;
      doc.setDrawColor(0, 0, 0);
      doc.line(125, y, 170, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', 25, y);
      doc.text(': ', 125, y);
      doc.text(formatRupiah(totalPemasukan), 170, y, { align: 'right' });
      y += 20;

      // PENGELUARAN Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PENGELUARAN', 20, y);
      y += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      counter = 1;
      let totalPengeluaran = 0;

      // Pengeluaran per kategori (data real dari web)
      pengeluaranKategori.forEach(item => {
        const kategori = item.kategori.toUpperCase().replace(/_/g, ' ');
        const total = parseFloat(item.total);
        doc.text(`${counter}. ${kategori}`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(total), 170, y, { align: 'right' });
        totalPengeluaran += total;
        y += 8;
        counter++;
      });

      // Kas keluar per kategori (data real dari web)
      kasKeluarKategori.forEach(item => {
        const kategori = item.kategori.toUpperCase().replace(/_/g, ' ');
        const total = parseFloat(item.total);
        doc.text(`${counter}. ${kategori}`, 25, y);
        doc.text(': ', 125, y);
        doc.text(formatRupiah(total), 170, y, { align: 'right' });
        totalPengeluaran += total;
        y += 8;
        counter++;
      });

      // Jika tidak ada data pengeluaran
      if (totalPengeluaran === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Tidak ada pengeluaran pada periode ini', 25, y);
        y += 8;
      }

      // Total Pengeluaran
      y += 3;
      doc.line(125, y, 170, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', 25, y);
      doc.text(': ', 125, y);
      doc.text(formatRupiah(totalPengeluaran), 170, y, { align: 'right' });
      y += 20;

      // Ringkasan Akhir
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RINGKASAN', 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('TOTAL PEMASUKAN', 25, y);
      doc.text(': ', 125, y);
      doc.text(formatRupiah(totalPemasukan), 170, y, { align: 'right' });
      y += 8;

      doc.text('TOTAL PENGELUARAN', 25, y);
      doc.text(': ', 125, y);
      doc.text(formatRupiah(totalPengeluaran), 170, y, { align: 'right' });
      y += 8;

      // Garis untuk saldo akhir
      doc.setDrawColor(0, 0, 0);
      doc.line(125, y + 2, 170, y + 2);
      y += 10;

      const saldoAkhirCalculated = totalPemasukan - totalPengeluaran;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('SALDO AKHIR', 25, y);
      doc.text(': ', 125, y);
      doc.text(formatRupiah(saldoAkhirCalculated), 170, y, { align: 'right' });

      // Area tanda tangan
      y += 35;
      if (y > 210) {
        doc.addPage();
        y = 30;
      }

      // Bagian tanda tangan
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Yang bertanda tangan
      doc.text('Yang Bertanda Tangan,', 25, y);
      
      // Ruang untuk tanda tangan
      y += 35;
      
      // Garis titik-titik untuk tanda tangan - di tengah
      doc.setFontSize(10);
      doc.text('(........................................................)', 105, y, { align: 'center' });
      
      // Pengurus Masjid - di bawah garis titik-titik
      y += 8;
      doc.text('Pengurus Masjid', 105, y, { align: 'center' });
      
      // Footer informasi sistem - posisi di bagian paling bawah
      y += 20;
      doc.setDrawColor(0, 0, 0);
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })} pukul ${new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, y);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('Laporan ini dibuat otomatis oleh sistem', 105, y + 6, { align: 'center' });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="laporan-zakat-${dari}-${sampai}.pdf"`,
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}