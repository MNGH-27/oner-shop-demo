import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

type UploadedImage = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
};

export function imageExtension(
  buffer: Buffer,
): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (
    buffer.length >= 3 &&
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  ) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  if (
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  ) {
    return 'gif';
  }
  return null;
}

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
} as const;

@ApiTags('Admin - Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/uploads')
export class UploadsController {
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'files', maxCount: 10 }], {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
          cb(null, false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 1, parts: 11 },
    }),
  )
  async upload(@UploadedFiles() uploaded: { files?: UploadedImage[] }) {
    const files = uploaded?.files ?? [];
    if (!files.length) {
      throw new BadRequestException('فایلی ارسال نشده است یا فرمت مجاز نیست');
    }

    const detected = files.map((file) => ({
      file,
      extension: imageExtension(file.buffer),
    }));
    if (detected.some((item) => !item.extension)) {
      throw new BadRequestException('محتوای یک یا چند فایل، تصویر معتبر نیست');
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const items = await Promise.all(
      detected.map(async ({ file, extension }) => {
        const safeExtension = extension!;
        const filename = `${randomUUID()}.${safeExtension}`;
        await writeFile(join(UPLOAD_DIR, filename), file.buffer, {
          flag: 'wx',
        });
        return {
          url: `/uploads/${filename}`,
          filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: MIME_BY_EXTENSION[safeExtension],
        };
      }),
    );
    return { items };
  }
}
