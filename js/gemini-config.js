// Google Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyDSZVy2MCqee9lVslwt-Sfmxde8C7vzU4o'; // Your API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent';

// Generate AI summary for patient
async function generatePatientSummary(patientData, visitsData) {
    try {
        // Prepare patient context
        const patientInfo = `
Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Blood Group: ${patientData.bloodGroup || 'Not specified'}
- Medical History: ${patientData.medicalHistory || 'None recorded'}
- Total Visits: ${visitsData.length}
`;

        // Prepare visits summary
        let visitsSummary = '\nVisit History:\n';
        visitsData.forEach((visit, index) => {
            const visitDate = visit.visitDate.toDate().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            visitsSummary += `\nVisit ${index + 1} (${visitDate}):\n`;
            visitsSummary += `- Symptoms: ${visit.symptoms}\n`;
            visitsSummary += `- Diagnosis: ${visit.diagnosis}\n`;
            
            if (visit.medicines && visit.medicines.length > 0) {
                visitsSummary += `- Medicines: ${visit.medicines.map(m => m.name).join(', ')}\n`;
            }
            
            if (visit.notes) {
                visitsSummary += `- Notes: ${visit.notes}\n`;
            }
        });

        // Create the prompt
        const prompt = `You are a medical assistant helping doctors review patient information. Analyze this patient's data and provide a concise, professional summary.

${patientInfo}
${visitsSummary}

Please provide a structured summary with the following sections:

1. **Patient Overview**: Brief introduction with key demographics and background
2. **Common Health Patterns**: Identify recurring symptoms or diagnoses
3. **Medication History**: Summarize frequently prescribed medications
4. **Key Health Concerns**: Important issues that need monitoring
5. **Recommendations**: Practical suggestions for the doctor (preventive care, follow-up areas)

Keep it concise (200-300 words), professional, and actionable. Use bullet points where appropriate.`;

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('API Error Response:', error);
            throw new Error(error.error?.message || 'Failed to generate summary');
        }

        const data = await response.json();
        console.log('API Success Response:', data);
        
        // Extract the generated text
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const summary = data.candidates[0].content.parts[0].text;
            return {
                success: true,
                summary: summary,
                timestamp: new Date()
            };
        } else {
            throw new Error('Unexpected API response format');
        }

    } catch (error) {
        console.error('Error generating AI summary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Format markdown-like text to HTML
function formatAISummary(text) {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert bullet points
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Convert numbered lists
    text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Convert line breaks to <br>
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');
    
    return text;
}