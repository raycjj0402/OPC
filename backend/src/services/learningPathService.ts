import prisma from '../utils/prisma';

interface OnboardingData {
  city: string;
  industries: string[];
  resourcePrefs: string[];
}

// 根据引导问卷生成个性化学习路径
export async function generateLearningPath(userId: string, data: OnboardingData): Promise<void> {
  const { city, industries, resourcePrefs } = data;

  // 构建标签查询 - 三维交叉匹配
  const tagQueries: string[][] = [];

  // 城市标签
  const cityTags = [city, 'all'];

  // 行业标签
  const industryTags = [...industries, 'all'];

  // 资源类型标签
  const resourceTagMap: Record<string, string[]> = {
    '政府补贴政策': ['government', 'policy'],
    'AI工具使用': ['ai-tools', 'tools'],
    '行业落地方法论': ['methodology', 'industry'],
    '产品开发技术': ['development', 'tech'],
    '获客与运营': ['growth', 'marketing'],
  };

  const resourceTags = resourcePrefs.flatMap(pref => resourceTagMap[pref] || []);

  // 查找匹配的模块
  const modules = await prisma.module.findMany({
    where: {
      isPublished: true,
      AND: [
        {
          OR: cityTags.map(tag => ({
            tags: { has: tag }
          }))
        },
        {
          OR: [
            ...industryTags.map(tag => ({
              tags: { has: tag }
            })),
            ...resourceTags.map(tag => ({
              tags: { has: tag }
            }))
          ]
        }
      ]
    },
    orderBy: { order: 'asc' },
    take: 8, // 最多8个模块
  });

  // 如果匹配模块不足，补充通用模块
  if (modules.length < 3) {
    const generalModules = await prisma.module.findMany({
      where: {
        isPublished: true,
        tags: { has: 'all' },
        id: { notIn: modules.map(m => m.id) }
      },
      orderBy: { order: 'asc' },
      take: 3 - modules.length,
    });
    modules.push(...generalModules);
  }

  // 生成学习路径标题
  const pathTitle = `${city} · ${industries.join('/')} 创业路径`;

  // 创建或更新学习路径
  const existingPath = await prisma.learningPath.findUnique({ where: { userId } });

  if (existingPath) {
    // 删除旧的模块关联
    await prisma.learningPathModule.deleteMany({
      where: { learningPathId: existingPath.id }
    });

    // 更新路径
    await prisma.learningPath.update({
      where: { id: existingPath.id },
      data: {
        title: pathTitle,
        modules: {
          create: modules.map((m, idx) => ({
            moduleId: m.id,
            order: idx,
          }))
        }
      }
    });
  } else {
    await prisma.learningPath.create({
      data: {
        userId,
        title: pathTitle,
        modules: {
          create: modules.map((m, idx) => ({
            moduleId: m.id,
            order: idx,
          }))
        }
      }
    });
  }
}

// 计算学习路径进度
export async function calculatePathProgress(userId: string) {
  const path = await prisma.learningPath.findUnique({
    where: { userId },
    include: {
      modules: {
        include: {
          module: {
            include: {
              chapters: {
                include: {
                  lessons: {
                    include: {
                      progress: {
                        where: { userId }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!path) return null;

  const moduleStats = path.modules.map(pm => {
    const module = pm.module;
    const chapters = module.chapters.map(chapter => {
      const lessons = chapter.lessons;
      const completedLessons = lessons.filter(l =>
        l.progress.some(p => p.completed)
      ).length;

      return {
        id: chapter.id,
        title: chapter.title,
        total: lessons.length,
        completed: completedLessons,
        progress: lessons.length > 0 ? Math.round(completedLessons / lessons.length * 100) : 0,
      };
    });

    const totalLessons = chapters.reduce((sum, c) => sum + c.total, 0);
    const completedLessons = chapters.reduce((sum, c) => sum + c.completed, 0);

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      icon: module.icon,
      chapters,
      total: totalLessons,
      completed: completedLessons,
      progress: totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0,
      order: pm.order,
    };
  });

  const totalModules = moduleStats.length;
  const completedModules = moduleStats.filter(m => m.progress === 100).length;
  const overallProgress = totalModules > 0
    ? Math.round(moduleStats.reduce((sum, m) => sum + m.progress, 0) / totalModules)
    : 0;

  return {
    id: path.id,
    title: path.title,
    modules: moduleStats,
    totalModules,
    completedModules,
    overallProgress,
  };
}
