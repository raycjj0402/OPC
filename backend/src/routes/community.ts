import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/community/posts - 帖子列表
router.get('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10', industry, featured } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { status: 'PUBLISHED' };
  if (industry) where.industry = industry;
  if (featured === 'true') where.isFeatured = true;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { comments: true, likes: true } },
        likes: {
          where: { userId: req.user!.userId },
          select: { id: true }
        }
      }
    }),
    prisma.post.count({ where })
  ]);

  res.json({
    data: posts.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content.slice(0, 200) + (p.content.length > 200 ? '...' : ''),
      industry: p.industry,
      tags: p.tags,
      isPinned: p.isPinned,
      isFeatured: p.isFeatured,
      viewCount: p.viewCount,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      liked: p.likes.length > 0,
      author: p.author,
      createdAt: p.createdAt,
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /api/community/posts/:id - 帖子详情
router.get('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { comments: true, likes: true } },
      likes: {
        where: { userId: req.user!.userId },
        select: { id: true }
      }
    }
  });

  if (!post) return res.status(404).json({ message: '帖子不存在' });

  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

  res.json({
    ...post,
    commentCount: post._count.comments,
    likeCount: post._count.likes,
    liked: post.likes.length > 0,
  });
});

// POST /api/community/posts - 发帖
router.post('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  const { title, content, industry, tags } = req.body;

  if (!title || title.trim().length < 2) {
    return res.status(400).json({ message: '标题不能少于2个字' });
  }
  if (!content || content.trim().length < 10) {
    return res.status(400).json({ message: '内容不能少于10个字' });
  }

  const post = await prisma.post.create({
    data: {
      authorId: req.user!.userId,
      title: title.trim(),
      content: content.trim(),
      industry,
      tags: tags || [],
      status: 'PUBLISHED',
    }
  });

  res.status(201).json({ message: '发布成功', postId: post.id });
});

// PUT /api/community/posts/:id - 编辑帖子
router.put('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.authorId !== req.user!.userId) {
    return res.status(403).json({ message: '无权编辑该帖子' });
  }

  const { title, content, industry, tags } = req.body;
  await prisma.post.update({
    where: { id: post.id },
    data: { title, content, industry, tags }
  });

  res.json({ message: '编辑成功' });
});

// DELETE /api/community/posts/:id - 删除帖子
router.delete('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.authorId !== req.user!.userId) {
    return res.status(403).json({ message: '无权删除该帖子' });
  }

  await prisma.post.update({ where: { id: post.id }, data: { status: 'DELETED' } });
  res.json({ message: '删除成功' });
});

// POST /api/community/posts/:id/like - 点赞/取消
router.post('/posts/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const postId = req.params.id;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ message: '帖子不存在' });

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } }
  });

  if (existing) {
    await prisma.postLike.delete({ where: { postId_userId: { postId, userId } } });
    return res.json({ liked: false });
  }

  await prisma.postLike.create({ data: { postId, userId } });
  res.json({ liked: true });
});

// GET /api/community/posts/:id/comments - 评论列表
router.get('/posts/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const comments = await prisma.comment.findMany({
    where: { postId: req.params.id, parentId: null, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      replies: {
        where: { status: 'PUBLISHED' },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json(comments);
});

// POST /api/community/posts/:id/comments - 发评论
router.post('/posts/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { content, parentId } = req.body;

  if (!content || content.trim().length < 1) {
    return res.status(400).json({ message: '评论内容不能为空' });
  }

  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ message: '帖子不存在' });

  const comment = await prisma.comment.create({
    data: {
      postId: req.params.id,
      authorId: req.user!.userId,
      content: content.trim(),
      parentId: parentId || null,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } }
    }
  });

  res.status(201).json(comment);
});

export default router;
