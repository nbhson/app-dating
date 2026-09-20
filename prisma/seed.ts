import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const firstNames = [
  ["Emma", "WOMAN"], ["Liam", "MAN"], ["Olivia", "WOMAN"], ["Noah", "MAN"], ["Ava", "WOMAN"],
  ["Minh", "MAN"], ["Linh", "WOMAN"], ["Hana", "WOMAN"], ["Ken", "MAN"], ["Sofia", "WOMAN"],
  ["James", "MAN"], ["Isabella", "WOMAN"], ["Lucas", "MAN"], ["Mia", "WOMAN"], ["Ethan", "MAN"],
  ["Amara", "WOMAN"], ["Daniel", "MAN"], ["Chloe", "WOMAN"], ["Harper", "WOMAN"], ["Aria", "WOMAN"],
  ["Leo", "MAN"], ["Nora", "WOMAN"], ["Akira", "MAN"], ["Yuki", "WOMAN"], ["Zane", "MAN"],
  ["Elio", "MAN"], ["Maya", "WOMAN"], ["Alex", "NON_BINARY"], ["Jordan", "NON_BINARY"], ["Casey", "NON_BINARY"],
  ["Riley", "WOMAN"], ["Ava2", "WOMAN"], ["Ben", "MAN"], ["Tom", "MAN"], ["Sara", "WOMAN"],
];

const bios = [
  "Mình thích buổi sáng chậm với cà phê và một cuốn sách đang đọc dở. Tìm người biết lắng nghe.",
  "Cuối tuần hay leo núi, tuần thì code. Muốn trò chuyện có chiều sâu, không vội.",
  "Mới chuyển đến thành phố. Bạn chỉ mình quán quen nhé?",
  "Yoga, sách và playlist lofi. Mình tin sự tử tế là hấp dẫn nhất.",
  "Đang xây thứ gì đó nhỏ và khám phá. Thích người tò mò.",
  "Chụp ảnh hoàng hôn và giữ thói quen viết tay mỗi sáng.",
  "Gym, nấu ăn và những câu đùa dở. Đến lượt bạn.",
  "Đã đi 12 nơi, nơi tiếp theo muốn đi cùng ai đó hợp.",
];

const interestsPool = ["Coffee","Travel","Music","Hiking","Yoga","Books","Movies","Gaming","Cooking","Art","Fitness","Photography","Dance","Brunch"];
const locations = ["Quận 1, Sài Gòn","Thảo Điền","Đà Nẵng","Hà Nội","Bangkok","Singapore"];
const occupations = ["Designer","Engineer","Marketing","Teacher","Photographer","Founder","Doctor","Artist"];
const educations = ["RMIT","HCMUS","FTU","NTU","Chulalongkorn","Self-taught"];
const intents = ["LONG_TERM","EXPLORING","FRIENDSHIP","UNSURE","SHORT_TERM"];
const promptQs = [
  "Điều khiến mình tò mò gần đây",
  "Một ngày Chủ Nhật hoàn hảo",
  "Cách mình thể hiện sự quan tâm",
  "Điều mình đang học về bản thân",
  "Mình muốn được hiểu điều gì ngay từ đầu",
];
const promptAs = [
  "Cách người ta giữ thói quen viết tay mỗi sáng lúc 6h.",
  "Dậy muộn, chợ hoa, nấu brunch và đi dạo không đích đến.",
  "Nhớ những điều nhỏ họ từng nói và hỏi lại sau một tuần.",
  "Học cách nói không mà không thấy tội lỗi.",
  "Mình hơi hướng nội lúc đầu, nhưng ấm dần khi tin tưởng.",
  "Mình thích đi bộ đường dài và mang theo máy film cũ.",
];

function random<T>(arr: T[]) { return arr[Math.floor(Math.random()*arr.length)]; }
function randomAge() { return 22 + Math.floor(Math.random()*12); }

async function main() {
  console.log("Seeding...");
  const demoPasswordHash = await bcrypt.hash("Lumen123!", 10);
  // Demo users chỉ tạo khi SEED_DEMO=1 — mặc định giữ DB sạch, chỉ user đăng ký thật mới hiện ở Bưu thiếp
  if (process.env.SEED_DEMO === "1") {
  for (let i=0; i<35; i++) {
    const [baseName, gender] = firstNames[i % firstNames.length];
    const name = i < firstNames.length ? baseName : `${baseName}${i}`;
    const email = `demo${i+1}@lumen.app`;
    let user = await prisma.user.findUnique({ where: { email }});
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, passwordHash: demoPasswordHash, status: "ACTIVE", isAdmin: i===0, lastActiveAt: new Date(Date.now() - Math.random()*7*24*60*60*1000) },
      });
    } else if (!user.passwordHash) {
      user = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: demoPasswordHash } });
    }
    const age = randomAge();
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(Math.floor(Math.random()*12));
    dob.setDate(Math.floor(Math.random()*28)+1);

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: name,
        dob,
        gender: gender as string,
        location: random(locations),
        bio: random(bios),
        occupation: random(occupations),
        education: random(educations),
        interests: JSON.stringify([random(interestsPool), random(interestsPool), random(interestsPool)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,3)),
      }
    });

    const pref = await prisma.preference.findUnique({ where: { userId: user.id }});
    if (!pref) {
      await prisma.preference.create({
        data: {
          userId: user.id,
          interestedIn: Math.random() < 0.3 ? "EVERYONE" : Math.random()<0.5 ? "MEN" : "WOMEN",
          minAge: 20, maxAge: 35,
          intent: random(intents),
        }
      });
    } else if (!(pref as any).intent) {
      await prisma.preference.update({ where: { userId: user.id }, data: { intent: random(intents) } });
    }

    const paCount = await prisma.promptAnswer.count({ where: { userId: user.id }});
    if (paCount===0) {
      const q1 = random(promptQs); let q2 = random(promptQs); while(q2===q1) q2=random(promptQs);
      await prisma.promptAnswer.createMany({ data: [
        { userId: user.id, question: q1, answer: random(promptAs) },
        { userId: user.id, question: q2, answer: random(promptAs) },
      ]});
    }

    const photoCount = await prisma.profilePhoto.count({ where: { userId: user.id }});
    if (photoCount===0) {
      const seeds = [
        `https://i.pravatar.cc/600?img=${(i%70)+1}`,
        `https://picsum.photos/seed/${user.id}1/600/800`,
        `https://picsum.photos/seed/${user.id}2/600/800`,
      ];
      for (let j=0;j<2;j++) {
        await prisma.profilePhoto.create({ data: { userId: user.id, url: seeds[j], position: j }});
      }
    }
  }

  // daily question today
  const today = new Date().toISOString().slice(0,10);
  const dq = await prisma.dailyQuestion.findUnique({ where: { date: today }});
  if (!dq) {
    await prisma.dailyQuestion.create({ data: { date: today, question: "Điều nhỏ nào khiến bạn thấy được quan tâm?" }});
  }
  // daily answers for some users
  const users = await prisma.user.findMany({ take: 15 });
  for (const u of users.slice(0,8)) {
    const exists = await prisma.dailyAnswer.findUnique({ where: { userId_date: { userId: u.id, date: today } }});
    if (!exists) await prisma.dailyAnswer.create({ data: { userId: u.id, date: today, answer: random(promptAs) }});
  }

  }

  const allUsers = await prisma.user.findMany({ take: 10 });
  if (process.env.SEED_DEMO === "1" && allUsers.length >= 2) {
    const a = allUsers[0].id, b = allUsers[1].id;
    await prisma.like.upsert({ where: { fromUserId_toUserId: { fromUserId: a, toUserId: b }}, update:{ comment: "Mình cũng thích cách bạn viết về buổi sáng chậm" }, create:{ fromUserId: a, toUserId: b, comment: "Mình cũng thích cách bạn viết về buổi sáng chậm" }});
    await prisma.like.upsert({ where: { fromUserId_toUserId: { fromUserId: b, toUserId: a }}, update:{ comment: "Ảnh film của bạn ấm quá" }, create:{ fromUserId: b, toUserId: a, comment: "Ảnh film của bạn ấm quá" }});
    const userAId = a < b ? a : b;
    const userBId = a < b ? b : a;
    let match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId, userBId }}});
    if (!match) match = await prisma.match.create({ data: { userAId, userBId }});
    const msgCount = await prisma.message.count({ where: { matchId: match.id }});
    if (msgCount===0) {
      await prisma.message.createMany({ data: [
        { matchId: match.id, senderId: a, content: "“Mình cũng thích cách bạn viết về buổi sáng chậm” — bưu thiếp mở lời" },
        { matchId: match.id, senderId: b, content: "“Ảnh film của bạn ấm quá” — bưu thiếp mở lời" },
        { matchId: match.id, senderId: a, content: "Bạn thường viết lúc mấy giờ?" },
      ]});
    }
  }

  console.log("Seed done. " + (process.env.SEED_DEMO === "1" ? "Admin: demo1@lumen.app / Lumen123!" : "SEED_DEMO!=1 nên không tạo demo users — chỉ giữ user đăng ký thật"));
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
