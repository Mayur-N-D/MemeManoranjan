const GEMINI_API_KEY = 'AIzaSyCV0Qj_qq-dNPKoEhkNJ-Lxs3scpAxU_fQ';

async function testApi() {
    const prompt = "Generate a short humorous meme caption about: dog. The meme is 'Doge'.";
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('FAILED with status:', response.status);
            console.error(JSON.stringify(data, null, 2));
        } else {
            console.log('SUCCESS!');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Network or fetch error:', e);
    }
}

testApi();
