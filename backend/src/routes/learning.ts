import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { calculatePathProgress } from '../services/learningPathService';

const router = Router();

// GET /api/learning/path - 获取用户学习路径（含进度）
router.get('/path', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const progress = await calculatePathProgress(userId);

  if (!progress) {
    return res.status(404).json({ message: '尚未生成学习路径，请先完成引导问卷' });
  }

  res.json(progress);
});

// GET /api/learning/module/:moduleId - 获取模块详情
router.get('/module/:moduleId', authenticate, async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const userId = req.user!.userId;

  const module = await prisma.module.findUnique({
    where: { id: moduleId, isPublished: true },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              progress: {
                where: { userId }
              }
            }
          }
        }
      }
    }
  });

  if (!module) return res.status(404).json({ message: '模块不存在' });

  const chapters = module.chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    description: chapter.description,
    lessons: chapter.lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType,
      duration: lesson.duration,
      completed: lesson.progress[0]?.completed || false,
      progress: lesson.progress[0]?.progress || 0,
    }))
  }));

  res.json({
    id: module.id,
    slug: module.slug,
    title: module.title,
    description: module.description,
    icon: module.icon,
    chapters,
  });
});

// GET /api/learning/lesson/:lessonId - 获取课时内容
router.get('/lesson/:lessonId', authenticate, async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user!.userId;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isPublished: true },
    include: {
      chapter: {
        include: {
          module: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, order: true }
          }
        }
      },
      progress: {
        where: { userId }
      }
    }
  });

  if (!lesson) return res.status(404).json({ message: '课时不存在' });

  const currentIndex = lesson.chapter.lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lesson.chapter.lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lesson.chapter.lessons.length - 1
    ? lesson.chapter.lessons[currentIndex + 1] : null;

  res.json({
    id: lesson.id,
    title: lesson.title,
    contentType: lesson.contentType,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    pdfUrl: lesson.pdfUrl,
    duration: lesson.duration,
    chapter: {
      id: lesson.chapter.id,
      title: lesson.chapter.title,
      module: {
        id: lesson.chapter.module.id,
        title: lesson.chapter.module.title,
      }
    },
    progress: lesson.progress[0]?.progress || 0,
    completed: lesson.progress[0]?.completed || false,
    prevLesson,
    nextLesson,
  });
});

// POST /api/learning/lesson/:lessonId/progress - 更新学习进度
router.post('/lesson/:lessonId/progress', authenticate, async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const { progress, completed } = req.body;
  const userId = req.user!.userId;

  if (progress === undefined || progress < 0 || progress > 100) {
    return res.status(400).json({ message: '进度值无效' });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return res.status(404).json({ message: '课时不存在' });

  const isCompleted = completed || progress >= 80;

  const record = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      progress: Math.max(progress, 0),
      completed: isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    },
    create: {
      userId,
      lessonId,
      progress,
      completed: isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    }
  });

  res.json({ message: '进度已更新', completed: record.completed });
});

// POST /api/learning/lesson/:lessonId/mark-complete - 手动标记完成
router.post('/lesson/:lessonId/mark-complete', authenticate, async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user!.userId;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { progress: 100, completed: true, completedAt: new Date() },
    create: { userId, lessonId, progress: 100, completed: true, completedAt: new Date() }
  });

  res.json({ message: '已标记为完成' });
});

// GET /api/learning/stats - 获取学习统计
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const completedCount = await prisma.lessonProgress.count({
    where: { userId, completed: true }
  });

  const recentProgress = await prisma.lessonProgress.findMany({
    where: { userId, completed: true },
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: {
      lesson: {
        include: {
          chapter: { include: { module: true } }
        }
      }
    }
  });

  // 计算连续学习天数
  const allProgress = await prisma.lessonProgress.findMany({
    where: { userId, completed: true },
    select: { completedAt: true },
    orderBy: { completedAt: 'desc' }
  });

  let streakDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const learnedDays = new Set(
    allProgress
      .filter(p => p.completedAt)
      .map(p => p.completedAt!.toDateString())
  );

  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (learnedDays.has(d.toDateString())) {
      streakDays++;
    } else {
      break;
    }
  }

  res.json({
    completedLessons: completedCount,
    streakDays,
    recentLessons: recentProgress.map(p => ({
      lessonId: p.lessonId,
      title: p.lesson.title,
      moduleTitle: p.lesson.chapter.module.title,
      completedAt: p.completedAt,
    }))
  });
});

export default router;
