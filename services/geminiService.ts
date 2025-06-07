import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { EmployeePreference, ShiftRequirements, GeneratedSchedule, RequirementSlot, Employee, AvailabilityStatus, TimeSlotPreference } from '../types';

const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

// 日付のフォーマット（例: 2024-08-15 -> 8月15日(木)）
const formatDateForDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00"); // ローカルタイムゾーンとして解釈
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
};

const formatEmployeePreferencesForPrompt = (preferences: EmployeePreference[], employees: Employee[]): string => {
  if (preferences.length === 0) {
    return '従業員からの希望提出はありませんでした。';
  }
  return preferences
    .map(pref => {
      const employee = employees.find(e => e.id === pref.employeeId);
      const role = employee ? employee.role : '役職不明';
      let preferenceDetails = `- ${pref.employeeName} (ID: ${pref.employeeId}, 役職: ${role}):\n`;

      const sortedDates = Object.keys(pref.detailedAvailability).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      if (sortedDates.length === 0 && !pref.generalNotes) {
        preferenceDetails += `  具体的な日時希望はありません。\n`;
      } else {
        sortedDates.forEach(dateStr => {
          const timeSlots = pref.detailedAvailability[dateStr];
          if (timeSlots && timeSlots.length > 0) {
            preferenceDetails += `  ${formatDateForDisplay(dateStr)}:\n`;
            timeSlots.forEach(slot => {
              if (slot.status === AvailabilityStatus.UNAVAILABLE && slot.startTime === "00:00" && slot.endTime === "23:59") {
                 preferenceDetails += `    - 終日 (${slot.status})\n`;
              } else {
                 preferenceDetails += `    - ${slot.startTime} - ${slot.endTime} (${slot.status})\n`;
              }
            });
          }
        });
      }

      if (pref.generalNotes) {
        preferenceDetails += `  一般メモ: ${pref.generalNotes}\n`;
      }
      return preferenceDetails;
    })
    .join('\n');
};


const formatShiftRequirementsForPrompt = (dailyRequirements: { [date: string]: RequirementSlot[] }): string => {
  const sortedDates = Object.keys(dailyRequirements).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  if (sortedDates.length === 0 || sortedDates.every(date => dailyRequirements[date].length === 0)) {
    return "具体的な日時でのシフト要件は定義されていません。もしあればメモを頼りにするか、なければ標準的な業務運営を想定してください。";
  }
  
  let requirementsString = "";
  sortedDates.forEach(dateStr => {
    const slots = dailyRequirements[dateStr];
    if (slots && slots.length > 0) {
      requirementsString += `${formatDateForDisplay(dateStr)}:\n`;
      slots.forEach(slot => {
        requirementsString += `  - 時間: ${slot.timeRange}, 必要人数: ${slot.staffCount}${slot.role ? `, 役割: ${slot.role}` : ''}\n`;
      });
    }
  });
  return requirementsString;
};

const constructPrompt = (preferences: EmployeePreference[], requirements: ShiftRequirements, employees: Employee[]): string => {
  const preferencesString = formatEmployeePreferencesForPrompt(preferences, employees);
  const requirementsString = formatShiftRequirementsForPrompt(requirements.dailyRequirements);
  const notesString = requirements.notes ? `スケジューリングに関する一般メモ:\n${requirements.notes}` : '一般メモはありません。';

  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const currentMonthStr = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long'});
  const nextMonthStr = nextMonthDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long'});

  return `
あなたはAIシフトスケジューリングアシスタントです。
現在の月は ${currentMonthStr} です。従業員の希望とマネージャーのシフト要件は主に ${nextMonthStr} のものです。
あなたのタスクは、従業員の詳細な日時希望と、マネージャーが設定した特定の日付ごとのシフト要件に基づいて、**${nextMonthStr} の勤務スケジュール**を作成することです。

以下の点に注意してください:
1.  従業員の詳細な日時希望を注意深く分析してください。各希望には開始時刻、終了時刻、および「希望」「可能」「不可」の3つのステータスがあります。
    - 「希望」: その従業員が最も働きたい時間帯です。可能な限り優先してください。
    - 「可能」: その従業員が働くことができる時間帯です。
    - 「不可」: その従業員が働くことができない時間帯です。この時間帯に割り当てないでください。
    - 「終日 (不可)」はその日全体が勤務不可であることを意味します。
    - 従業員の役職も考慮してください（例：シフトリーダーが必要な場合など）。
2.  マネージャーが設定した、${nextMonthStr} の各日付における具体的なシフト要件（時間帯、必要スタッフ数、役割）を満たしてください。
3.  利用可能で希望している従業員の間で、彼らの希望を考慮し、シフトを公平に分配してください。
4.  提示された希望でシフト要件を満たせない場合は、「unassigned_shifts」配列に明確に記載してください。割り当てられなかった各シフトについて、日付、時間、役割/必要なスタッフ数、および簡単な理由を記載してください（例：「${nextMonthStr}X日 Y時間 Z役割の基準に合う利用可能な従業員がいません」）。
5.  スケジュールは、${nextMonthStr} の日付ごとに作成してください。AIの出力するJSONのキーは、シフトが割り当てられた実際の日付文字列（例: "2024-08-15"）を使用してください。

従業員の希望 (${nextMonthStr}分):
${preferencesString}

${nextMonthStr} のシフト要件:
${requirementsString}

${notesString}

スケジュールを厳密にJSONオブジェクトとして出力してください。
JSONオブジェクトは、割り当てられたシフトがある各日付のキー（例: "2024-08-15", "2024-08-16"）を持つ必要があります。
各日付の値は文字列の配列で、各文字列は「従業員名: HH:MM - HH:MM (役割)」の形式でシフトの割り当てを表します。そのシフトの入力要件で役割が指定されていなかった場合は、省略するか、「スタッフ」のような一般的な用語を使用できます。
割り当てられなかったシフトがある場合は、JSONオブジェクトのルートに「unassigned_shifts」配列を含めてください。この配列には、満たされなかった要件と理由を詳述する文字列を含める必要があります。

JSON出力例 (これは ${nextMonthStr} の特定の日のシフトを表します):
{
  "2024-08-15": [
    "アリス・スミス: 09:00 - 17:00 (レジ係)",
    "ボブ・ジョンソン: 09:00 - 17:00 (フロアスタッフ)"
  ],
  "2024-08-16": [
    "チャーリー・ブラウン: 10:00 - 18:00 (スーパーバイザー)"
  ],
  "unassigned_shifts": [
    "${nextMonthStr}20日 17:00 - 21:00 - 1名 (クローザー) 必要、該当日の夕方の希望を持つ利用可能な従業員がいません。"
  ]
}

出力はJSONオブジェクトのみにしてください。JSON構造外に他のテキストや説明を含めないでください。
入力に基づいてシフトを全く割り当てられない場合は、日付キーに空の配列を返し、unassigned_shiftsで説明してください。例: {"unassigned_shifts": ["必要なシフトに対して利用可能な従業員がいません。"]}
`;
};

export const generateScheduleWithAI = async (
  preferences: EmployeePreference[],
  requirements: ShiftRequirements,
  employees: Employee[]
): Promise<GeneratedSchedule> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY環境変数が設定されていません。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = constructPrompt(preferences, requirements, employees);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1, 
        }
    });

    let jsonStr = response.text ? response.text.trim() : '';
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedSchedule: GeneratedSchedule = JSON.parse(jsonStr);
      if (typeof parsedSchedule !== 'object' || parsedSchedule === null) {
        throw new Error("AIからの応答は、有効なスケジュールJSONオブジェクトではありません。");
      }
      return parsedSchedule;
    } catch (e) {
      console.error("Failed to parse JSON response from AI:", jsonStr, e);
      throw new Error(`AIからの応答を有効なスケジュールJSONとして解析できませんでした。未加工の応答: ${jsonStr}`);
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`AIによるスケジュール生成に失敗しました: ${error.message}`);
    }
    throw new Error("AIによるスケジュール生成中に不明なエラーが発生しました。");
  }
};