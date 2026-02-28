/**
 * API Types for Project Files
 * Matches backend schema for file management endpoints
 */

/**
 * File type enum matching backend
 */
export type FileType =
  | 'component'
  | 'page'
  | 'layout'
  | 'style'
  | 'config'
  | 'asset'
  | 'screen'
  | 'other';

/**
 * Project file interface matching backend schema
 */
export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content: string | null;
  fileType: FileType;
  mimeType: string | null;
  size: number;
  isScreen: boolean;
  screenId: string | null;
  parentId: string | null;
  orderIndex: number;
  version: number;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * File version for history tracking
 */
export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  content: string | null;
  size: number;
  checksum: string | null;
  changeDescription: string | null;
  createdBy: string | null;
  createdAt: string;
}

/**
 * DTO for creating a new file
 */
export interface CreateFileRequest {
  name: string;
  path: string;
  content?: string;
  fileType?: FileType;
  mimeType?: string;
  isScreen?: boolean;
  screenId?: string;
  parentId?: string;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating an existing file
 */
export interface UpdateFileRequest {
  name?: string;
  path?: string;
  content?: string;
  fileType?: FileType;
  mimeType?: string;
  isScreen?: boolean;
  screenId?: string;
  parentId?: string;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
  changeDescription?: string;
}

/**
 * File tree node structure
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  file?: ProjectFile;
}

/**
 * Screen file type - a ProjectFile with isScreen=true
 */
export type ScreenFile = ProjectFile & {
  isScreen: true;
  screenId: string;
};

/**
 * Response for file versions endpoint
 */
export interface FileVersionsResponse {
  versions: FileVersion[];
  currentVersion: number;
  totalVersions: number;
}

/**
 * Response for project tree endpoint
 */
export interface ProjectTreeResponse {
  tree: FileTreeNode;
  totalFiles: number;
  totalSize: number;
}

/**
 * Response for revert file endpoint
 */
export interface RevertFileResponse {
  success: boolean;
  file: ProjectFile;
  revertedFromVersion: number;
}

/**
 * Paginated files response
 */
export interface PaginatedFilesResponse {
  files: ProjectFile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Query params for listing files
 */
export interface ListFilesParams {
  page?: number;
  pageSize?: number;
  fileType?: FileType;
  isScreen?: boolean;
  parentId?: string | null;
  sortBy?: 'name' | 'path' | 'createdAt' | 'updatedAt' | 'orderIndex';
  sortOrder?: 'asc' | 'desc';
}
