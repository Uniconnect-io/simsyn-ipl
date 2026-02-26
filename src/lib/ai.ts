import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function getIdeaScoreAndFeedback(title: string, content: string) {
    if (!openai) {
        // Mock scoring logic for testing if no API key
        return {
            score: 1,
            feedback: "AI scoring is currently disabled. Default score assigned."
        };
    }

    const prompt = `
You are an expert innovation judge for UniConnect, a customer engagement and contact center platform.
Evaluate the following idea based on its alignment with the UniConnect roadmap and the contact center domain.

Criteria:
1. Alignment: Does it fit the contact center / customer engagement domain?
2. Uniqueness: Is it a novel idea or something very common?
3. Detail: Is the idea well-explained or just a one-liner?
4. Effort: Is it relatively low effort to implement but high value?

Scoring Rules (Strict):
- 6: Unique, detailed, high-value, and low implemention effort.
- 4: Very good idea, relevant, and well-thought-out.
- 3: Good idea, but might be common or require significant effort.
- 2: Relevant but basic or lacks detail.
- 1: Generic ideas (e.g., "enable audit logs", "add reporting") or "too generic" (e.g., "implement AI", "make it faster").
- 0: Irrelevant to the domain or nonsense.

Idea Title: ${title}
Idea Content: ${content}

Return a JSON object with:
{
  "score": number (0, 1, 2, 3, 4, or 6),
  "feedback": "A concise 2-3 sentence explanation of the score and suggestions for improvement."
}
`;

    try {
        console.log('--- AI REQUEST (Prompt) ---');
        console.log(prompt);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a strict innovation judge for a contact center tech platform." },
                { role: "user", content: prompt }
            ],
        });

        const result = JSON.parse(response.choices[0].message.content!);

        console.log('--- AI RESPONSE ---');
        console.log(JSON.stringify(result, null, 2));

        return result as { score: number; feedback: string };
    } catch (e) {
        console.error('AI Scoring error:', e);
        return { score: 1, feedback: "Error during AI evaluation. Assigned base score." };
    }
}
