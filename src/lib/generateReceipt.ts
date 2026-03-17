import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../types';

export const generateReceipt = (order: Order) => {
    const doc = new jsPDF();

    // add Logo/Header
    doc.setFontSize(20);
    doc.text('Constructora Store', 14, 22);
    doc.setFontSize(10);
    doc.text('Receipt of Purchase', 14, 30);

    // order Details
    doc.text(`Order ID: ${order.id}`, 14, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 45);

    // customer Details
    doc.text('Customer Details:', 14, 55);
    doc.text(`Name: ${order.customer.name}`, 14, 60);
    doc.text(`Phone: ${order.customer.phone}`, 14, 65);
    doc.text(`Address: ${order.customer.address}`, 14, 70);

    // table
    const tableColumn = ["Item", "Quantity", "Price", "Total"];
    const tableRows: (string | number)[][] = [];

    order.items.forEach(item => {
        const itemData = [
            item.product.name,
            item.quantity,
            `$${item.product.price.toFixed(2)}`,
            `$${(item.product.price * item.quantity).toFixed(2)}`
        ];
        tableRows.push(itemData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
    });

    // totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text(`Total: $${order.total.toFixed(2)}`, 14, finalY);

    // footer
    doc.text('Thank you for your purchase!', 14, finalY + 10);

    // save PDF
    doc.save(`receipt-${order.id}.pdf`);
};
