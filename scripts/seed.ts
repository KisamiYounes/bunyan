import './load-env'
import mongoose, { type Types } from 'mongoose'
import { connectToDatabase } from '../src/infrastructure/database/mongoose'
import { UserModel } from '../src/modules/identity/user.model'
import { CommunityModel } from '../src/modules/communities/community.model'
import { MembershipModel } from '../src/modules/communities/membership.model'
import { PostModel } from '../src/modules/communities/post.model'
import { CommentModel } from '../src/modules/communities/comment.model'
import { hashPassword } from '../src/modules/identity/password'
import { levelForXp } from '../src/shared/utils/level'

/**
 * Idempotent demo seed. Safe to run repeatedly: accounts are reset to the documented demo
 * password, while communities/posts are matched by natural keys and counters are recomputed.
 */

const DEMO_PASSWORD = 'BunyanDemo!2026'

interface SeedUser {
  email: string
  username: string
  name: string
  role: 'learner' | 'educator' | 'admin'
  bio: string
  xp: number
}

const users: SeedUser[] = [
  {
    email: 'admin@bunyan.local',
    username: 'admin',
    name: 'إدارة بُنيان',
    role: 'admin',
    bio: 'حساب تجريبي لإدارة المنصّة.',
    xp: 0,
  },
  {
    email: 'sara@bunyan.local',
    username: 'sara',
    name: 'سارة العبدالله',
    role: 'educator',
    bio: 'معلّمة برمجة ورياضيات، مهتمة بتعليم التفكير الحسابي.',
    xp: 420,
  },
  {
    email: 'omar@bunyan.local',
    username: 'omar',
    name: 'عمر الحسن',
    role: 'learner',
    bio: 'متعلّم يبني أساسه في البرمجة والرياضيات.',
    xp: 95,
  },
]

const communities = [
  {
    name: 'أساسيات البرمجة',
    slug: 'programming-basics',
    description: 'مجتمع للمبتدئين في البرمجة: مفاهيم أساسية، تمارين عملية، وأسئلة بلا حكم مسبق.',
    visibility: 'public' as const,
    topic: 'programming' as const,
    language: 'ar' as const,
    owner: 'sara@bunyan.local',
    rules: 'احترم الجميع، واشرح فكرتك قبل أن تطلب الحل الجاهز.',
    members: ['omar@bunyan.local'],
  },
  {
    name: 'رياضيات المرحلة الثانوية',
    slug: 'high-school-math',
    description: 'نراجع معًا الجبر والهندسة وحساب المثلثات، ونحل مسائل خطوة بخطوة.',
    visibility: 'public' as const,
    topic: 'mathematics' as const,
    language: 'ar' as const,
    owner: 'sara@bunyan.local',
    rules: 'اكتب محاولتك أولًا، ثم اسأل عمّا لم تفهمه.',
    members: ['omar@bunyan.local'],
  },
  {
    name: 'نادي القراءة الخاص',
    slug: 'reading-club',
    description: 'مساحة خاصة لمناقشة كتاب شهريًا، مع ملخصات وملاحظات مشتركة.',
    visibility: 'private' as const,
    topic: 'languages' as const,
    language: 'ar' as const,
    owner: 'sara@bunyan.local',
    rules: 'احترام آراء الآخرين، وعدم مشاركة محتوى النادي خارج العضوية.',
    members: ['omar@bunyan.local'],
  },
]

const posts = [
  {
    slug: 'programming-basics',
    author: 'sara@bunyan.local',
    title: 'كيف تبدأ تعلم البرمجة دون أن تشعر بالضياع؟',
    body: 'أفضل بداية ليست حفظ لغة كاملة، بل اختيار لغة واحدة وبناء ثلاثة مشاريع صغيرة بها. ابدأ بأساسيات المتغيّرات والشرط والتكرار، ثم انتقل إلى الدوال. اكتب الكود بيدك ولا تنسخه فقط، وحاول أن تشرح كل سطر بصوت مسموع. الخطة المقترحة: أسبوعان للأساسيات، ثم أسبوعان لبناء مشروع صغير مثل قائمة مهام.',
  },
  {
    slug: 'programming-basics',
    author: 'omar@bunyan.local',
    title: 'أخطأت في تمرين الحلقة التكرارية — أين المشكلة؟',
    body: 'كتبت حلقة while ولم أضع تغييرًا على المتغيّر داخل الحلقة، فتوقّف المتصفح عن الاستجابة. هل الخطأ في شرط الحلقة أم في نسيان تحديث القيمة؟ أرفقت المنطق كما كتبته.',
  },
  {
    slug: 'high-school-math',
    author: 'sara@bunyan.local',
    title: 'مسألة الأسبوع: معادلة من الدرجة الثانية',
    body: 'حلّوا المعادلة x² − 5x + 6 = 0 بثلاث طرق: التحليل، إكمال المربع، والقانون العام. قارنوا بين الطرق: أيّها كان أسرع؟ ولماذا؟ اكتبوا خطواتكم كاملة، فالهدف هو التفكير لا الناتج فقط.',
  },
]

const comments = [
  {
    slug: 'programming-basics',
    postTitle: 'كيف تبدأ تعلم البرمجة دون أن تشعر بالضياع؟',
    author: 'omar@bunyan.local',
    body: 'خطة واضحة، سأبدأ اليوم بمشروع قائمة المهام. شكرًا على ترتيب الخطوات.',
  },
  {
    slug: 'programming-basics',
    postTitle: 'أخطأت في تمرين الحلقة التكرارية — أين المشكلة؟',
    author: 'sara@bunyan.local',
    body: 'المشكلة على الأغلب في نسيان تحديث المتغيّر. أضف سطرًا يغيّر القيمة ثم أعد التجربة وأخبرنا بالنتيجة.',
  },
]

async function main() {
  await connectToDatabase()
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const userIdByEmail = new Map<string, string>()
  for (const user of users) {
    const doc = await UserModel.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          username: user.username,
          name: user.name,
          passwordHash,
          role: user.role,
          status: 'active',
          locale: 'ar',
          bio: user.bio,
          ageBand: 'adult',
          avatarUrl: undefined,
          xp: user.xp,
          level: levelForXp(user.xp),
          profileVisibility: 'public',
          guardianConsentAt: undefined,
        },
        $setOnInsert: { sessionVersion: 0 },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>()
    if (!doc) throw new Error(`Failed to seed user ${user.email}`)
    userIdByEmail.set(user.email, String(doc._id))
  }

  const communityIdBySlug = new Map<string, string>()
  for (const community of communities) {
    const ownerId = userIdByEmail.get(community.owner)
    if (!ownerId) throw new Error(`Missing seed owner ${community.owner}`)

    const doc = await CommunityModel.findOneAndUpdate(
      { slug: community.slug },
      {
        $setOnInsert: {
          name: community.name,
          description: community.description,
          visibility: community.visibility,
          topic: community.topic,
          language: community.language,
          rules: community.rules,
          ownerId,
          status: 'active',
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>()
    if (!doc) throw new Error(`Failed to seed community ${community.slug}`)
    const communityId = String(doc._id)
    communityIdBySlug.set(community.slug, communityId)

    await MembershipModel.findOneAndUpdate(
      { communityId, userId: ownerId },
      {
        $set: {
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    )

    for (const memberEmail of community.members) {
      const memberId = userIdByEmail.get(memberEmail)
      if (!memberId) continue
      await MembershipModel.findOneAndUpdate(
        { communityId, userId: memberId },
        { $set: { role: 'member', status: 'active', joinedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true },
      )
    }
  }

  for (const post of posts) {
    const communityId = communityIdBySlug.get(post.slug)
    const authorId = userIdByEmail.get(post.author)
    if (!communityId || !authorId) throw new Error(`Missing seed reference for post ${post.title}`)
    await PostModel.findOneAndUpdate(
      { communityId, title: post.title },
      { $set: { body: post.body, authorId, status: 'published' } },
      { upsert: true, setDefaultsOnInsert: true },
    )
  }

  for (const comment of comments) {
    const communityId = communityIdBySlug.get(comment.slug)
    const authorId = userIdByEmail.get(comment.author)
    if (!communityId || !authorId) throw new Error(`Missing seed reference for comment`)
    const post = await PostModel.findOne({ communityId, title: comment.postTitle })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>()
    if (!post) continue
    await CommentModel.findOneAndUpdate(
      { postId: post._id, authorId, body: comment.body },
      {
        $setOnInsert: {
          communityId,
          postId: post._id,
          authorId,
          body: comment.body,
          status: 'published',
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    )
  }

  // Recompute denormalised counters so repeated runs never inflate them.
  for (const [slug, communityId] of communityIdBySlug) {
    const [memberCount, postCount] = await Promise.all([
      MembershipModel.countDocuments({ communityId, status: 'active' }),
      PostModel.countDocuments({ communityId, status: 'published' }),
    ])
    await CommunityModel.updateOne({ _id: communityId }, { $set: { memberCount, postCount } })
    const communityPosts = await PostModel.find({ communityId })
      .select('_id')
      .lean<Array<{ _id: Types.ObjectId }>>()
    for (const post of communityPosts) {
      const commentCount = await CommentModel.countDocuments({
        postId: post._id,
        status: 'published',
      })
      await PostModel.updateOne({ _id: post._id }, { $set: { commentCount } })
    }
    console.log(`  ${slug}: ${memberCount} members, ${postCount} posts`)
  }

  console.log('\nDemo accounts (password for all: ' + DEMO_PASSWORD + ')')
  for (const user of users) {
    console.log(`  ${user.role.padEnd(8)} ${user.email}  (@${user.username})`)
  }
  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
