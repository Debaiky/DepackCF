import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LedgerRow, Currency, Transaction, AccountBalances, AIOptimizationPlan } from '../types';

const getClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const analyzeCashFlow = async (
  ledgerData: LedgerRow[],
  currency: string
): Promise<string> => {
  try {
    const ai = getClient();

    // Summarize data to avoid token limits
    const summary = ledgerData
        .filter((_, index) => index % 7 === 0) // Take weekly snapshot
        .map(row => `${row.date}: Balance ${Math.round(row.balance)}`)
        .join('\n');

    const prompt = `
        You are a senior financial analyst for "Depack". 
        Analyze the following projected cash flow for the ${currency} account over the next 90 days.
        
        Data points (Weekly snapshots):
        ${summary}
        
        Provide a concise assessment (max 3 sentences) of the liquidity health. 
        Point out any critical periods where balance dips negative or dangerously low.
        Suggest one actionable strategy if there is a risk.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI analysis. Check API Key.";
  }
};

export const optimizeCashFlowPlan = async (
    transactions: Transaction[],
    balances: AccountBalances,
    maxDeferralDays: number,
    rates: { eurUsd: number, usdEgp: number }
): Promise<AIOptimizationPlan> => {
    try {
        const ai = getClient();
        
        // Filter out locked transactions and prepare payload
        // We only send relevant fields to save tokens
        const activeTransactions = transactions.map(t => ({
            id: t.id,
            date: t.adjustedDate,
            originalDate: t.originalDate,
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            partner: t.partner,
            isLocked: t.isLocked
        }));

        const prompt = `
            You are a Cash Flow Optimization AI for Depack.
            OBJECTIVE: Minimize negative cash balances across all accounts (EGP, USD, EUR) over the next 90 days.
            
            CONTEXT:
            Exchange Rates: 
            1 EUR = ${rates.eurUsd} USD
            1 USD = ${rates.usdEgp} EGP
            
            CONSTRAINTS:
            1. You can defer 'Payable' transactions that are NOT locked.
            2. You cannot move a date earlier than its 'originalDate'.
            3. You cannot defer a payment more than ${maxDeferralDays} days past its 'originalDate'.
            4. Suggest Internal Transfers between EGP, USD, EUR to cover deficits. When suggesting a transfer, use the provided exchange rates to estimate the amount needed in the source currency to cover the deficit in the target currency.
            5. If deficits persist, suggest injections from 'Bank Debt' or 'SH Account'.

            CURRENT STATE:
            Opening Balances: ${JSON.stringify(balances)}
            Transactions: ${JSON.stringify(activeTransactions)}

            Provide a JSON response with a plan containing specific date adjustments and new transfer transactions.
        `;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                adjustments: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            transactionId: { type: Type.STRING },
                            suggestedDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                            reason: { type: Type.STRING }
                        },
                        required: ["transactionId", "suggestedDate", "reason"]
                    }
                },
                newTransactions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ["TRANSFER", "INJECTION"] },
                            sourceAccount: { type: Type.STRING },
                            targetAccount: { type: Type.STRING },
                            amount: { type: Type.NUMBER, description: "Amount in the Currency of the Source Account" },
                            currency: { type: Type.STRING },
                            date: { type: Type.STRING, description: "YYYY-MM-DD" },
                            reason: { type: Type.STRING }
                        },
                        required: ["type", "sourceAccount", "targetAccount", "amount", "currency", "date"]
                    }
                },
                summary: { type: Type.STRING }
            },
            required: ["adjustments", "newTransactions", "summary"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as AIOptimizationPlan;
        }
        throw new Error("Empty response from AI");

    } catch (error) {
        console.error("AI Optimization Error", error);
        throw error;
    }
}