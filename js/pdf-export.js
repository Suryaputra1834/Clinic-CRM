// Initialize jsPDF
const { jsPDF } = window.jspdf;

// Export patient report to PDF
async function exportPatientPDF() {
    if (!currentPatient) {
        showError('Patient data not loaded!');
        return;
    }

    try {
        // Show loading
        const exportBtn = document.querySelector('.btn-export');
        const originalText = exportBtn ? exportBtn.innerHTML : '';
        if (exportBtn) {
            exportBtn.innerHTML = '⏳ Generating...';
            exportBtn.disabled = true;
        }

        // Get doctor info
        const user = auth.currentUser;
        const doctorDoc = await db.collection('doctors').doc(user.uid).get();
        const doctorInfo = doctorDoc.exists ? doctorDoc.data() : {};

        // Get all visits
        const visitsSnapshot = await db.collection('visits')
            .where('doctorId', '==', user.uid)
            .where('patientId', '==', currentPatient.id)
            .orderBy('visitDate', 'desc')
            .get();

        const visits = [];
        visitsSnapshot.forEach(doc => {
            visits.push({ id: doc.id, ...doc.data() });
        });

        // Generate PDF
        const pdf = new jsPDF();
        let yPosition = 20;

        // Helper function to check page break
        const checkPageBreak = (requiredSpace) => {
            if (yPosition + requiredSpace > 280) {
                pdf.addPage();
                yPosition = 20;
            }
        };

        // Header - Clinic Name
        pdf.setFontSize(12);
        pdf.setFillColor(76, 175, 80);  // Green
        pdf.setFillColor(156, 39, 176); // Purple
        pdf.setFillColor(255, 87, 34);  // Orange
        pdf.rect(0, 0, 210, 40, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text(doctorInfo.clinicName || 'Medical Clinic', 105, 20, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Dr. ${doctorInfo.name || 'Doctor'}`, 105, 30, { align: 'center' });

        yPosition = 50;

        // Document Title
        pdf.setTextColor(0, 102, 204);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Patient Medical Report', 105, yPosition, { align: 'center' });
        yPosition += 15;

        // Patient Information Section
        pdf.setFillColor(240, 240, 240);
        pdf.rect(10, yPosition, 190, 8, 'F');
        pdf.setTextColor(0, 102, 204);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Patient Information', 15, yPosition + 6);
        yPosition += 15;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');

        const patientInfo = [
            `Name: ${currentPatient.name}`,
            `Age: ${currentPatient.age} years`,
            `Gender: ${currentPatient.gender}`,
            `Contact: ${currentPatient.contact}`,
            `Blood Group: ${currentPatient.bloodGroup || 'Not specified'}`,
            `Address: ${currentPatient.address || 'Not provided'}`,
        ];

        if (currentPatient.emergencyContact) {
            patientInfo.push(`Emergency Contact: ${currentPatient.emergencyContact}`);
        }

        patientInfo.forEach(line => {
            pdf.text(line, 15, yPosition);
            yPosition += 7;
        });

        if (currentPatient.medicalHistory) {
            yPosition += 3;
            pdf.setFont('helvetica', 'bold');
            pdf.text('Medical History / Allergies:', 15, yPosition);
            yPosition += 7;
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(currentPatient.medicalHistory, 180);
            lines.forEach(line => {
                checkPageBreak(7);
                pdf.text(line, 15, yPosition);
                yPosition += 7;
            });
        }

        yPosition += 10;

        // Visit History Section
        if (visits.length > 0) {
            checkPageBreak(30);

            pdf.setFillColor(240, 240, 240);
            pdf.rect(10, yPosition, 190, 8, 'F');
            pdf.setTextColor(0, 102, 204);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Visit History (${visits.length} visits)`, 15, yPosition + 6);
            yPosition += 15;

            visits.forEach((visit, index) => {
                checkPageBreak(50);

                // Visit number and date
                const visitDate = visit.visitDate.toDate();
                const dateStr = visitDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                const timeStr = visitDate.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Visit ${index + 1} - ${dateStr} at ${timeStr}`, 15, yPosition);
                yPosition += 8;

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');

                // Symptoms
                pdf.setFont('helvetica', 'bold');
                pdf.text('Symptoms:', 15, yPosition);
                yPosition += 6;
                pdf.setFont('helvetica', 'normal');
                const symptomLines = pdf.splitTextToSize(visit.symptoms || 'Not recorded', 175);
                symptomLines.forEach(line => {
                    checkPageBreak(6);
                    pdf.text(line, 20, yPosition);
                    yPosition += 6;
                });

                yPosition += 2;

                // Diagnosis
                pdf.setFont('helvetica', 'bold');
                pdf.text('Diagnosis:', 15, yPosition);
                yPosition += 6;
                pdf.setFont('helvetica', 'normal');
                const diagnosisLines = pdf.splitTextToSize(visit.diagnosis || 'Not recorded', 175);
                diagnosisLines.forEach(line => {
                    checkPageBreak(6);
                    pdf.text(line, 20, yPosition);
                    yPosition += 6;
                });

                yPosition += 2;

                // Medicines
                if (visit.medicines && visit.medicines.length > 0) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Prescribed Medicines:', 15, yPosition);
                    yPosition += 6;
                    pdf.setFont('helvetica', 'normal');

                    visit.medicines.forEach((med, medIndex) => {
                        checkPageBreak(6);
                        const medText = `${medIndex + 1}. ${med.name}${med.dosage ? ` - ${med.dosage}` : ''}${med.duration ? ` for ${med.duration}` : ''}`;
                        pdf.text(medText, 20, yPosition);
                        yPosition += 6;
                    });
                    yPosition += 2;
                }

                // Notes
                if (visit.notes) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Notes:', 15, yPosition);
                    yPosition += 6;
                    pdf.setFont('helvetica', 'normal');
                    const notesLines = pdf.splitTextToSize(visit.notes, 175);
                    notesLines.forEach(line => {
                        checkPageBreak(6);
                        pdf.text(line, 20, yPosition);
                        yPosition += 6;
                    });
                    yPosition += 2;
                }

                // Follow-up
                if (visit.followUpRequired && visit.followUpDate) {
                    const followUpDate = visit.followUpDate.toDate();
                    const followUpStr = followUpDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(255, 152, 0);
                    pdf.text(`⏰ Follow-up: ${followUpStr}`, 15, yPosition);
                    pdf.setTextColor(0, 0, 0);
                    yPosition += 6;
                }

                // Separator line
                yPosition += 5;
                pdf.setDrawColor(200, 200, 200);
                pdf.line(15, yPosition, 195, yPosition);
                yPosition += 10;
            });
        } else {
            checkPageBreak(20);
            pdf.setTextColor(100, 100, 100);
            pdf.setFontSize(11);
            pdf.text('No visit records available.', 15, yPosition);
            yPosition += 10;
        }

        // Footer
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            const footerText = `Generated on ${new Date().toLocaleDateString('en-IN')} | Page ${i} of ${pageCount}`;
            pdf.text(footerText, 105, 290, { align: 'center' });
        }

        // Save PDF
        const fileName = `${currentPatient.name.replace(/\s+/g, '_')}_Medical_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

        console.log('PDF generated successfully');

        // Restore button
        if (exportBtn) {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }

        // Show success message
        showSuccess('✅ Patient report exported successfully!');

    } catch (error) {
        console.error('Error generating PDF:', error);
        showError('❌ Error generating PDF: ' + error.message);

        // Restore button
        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) {
            exportBtn.innerHTML = '📄 Export PDF';
            exportBtn.disabled = false;
        }
    }
}