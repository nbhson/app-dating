import { prisma } from "./prisma";
import { todayKey } from "./utils";

const QUESTIONS = [
  "Điều gì khiến bạn tò mò gần đây nhất?",
  "Một buổi sáng hoàn hảo của bạn trông như thế nào?",
  "Bạn đang học cách gì về bản thân?",
  "Điều nhỏ nào khiến bạn thấy được quan tâm?",
  "Nếu được viết một lá thư cho chính mình 1 năm trước, bạn sẽ viết gì?",
  "Bạn muốn người kia hiểu điều gì về bạn ngay từ đầu?",
  "Khoảnh khắc nào trong tuần qua khiến bạn mỉm cười?",
  "Bạn tìm kiếm điều gì trong một mối quan hệ chậm?",
  "Âm nhạc nào đang lặp lại trong đầu bạn?",
  "Bạn thường nạp lại năng lượng bằng cách nào?",
];

export async function getTodayQuestion(): Promise<string> {
  const date = todayKey();
  let q = await prisma.dailyQuestion.findUnique({ where: { date } });
  if (!q) {
    const idx = Math.abs(hash(date)) % QUESTIONS.length;
    const question = QUESTIONS[idx];
    try {
      q = await prisma.dailyQuestion.create({ data: { date, question } });
    } catch {
      q = await prisma.dailyQuestion.findUnique({ where: { date } });
    }
  }
  return q!.question;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
