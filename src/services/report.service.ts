import { v4 as uuidv4 } from 'uuid';
import type { Report, ReportTargetType, ReportReason, ReportStatus, ReportPriority } from '../types';
import * as db from './database';

/**
 * ReportService - Sistema de reportes de usuarios y contenido
 */

const REPORTS_KEY = 'nexura_reports';

export class ReportService {
  /**
   * Crea un nuevo reporte
   */
  static createReport(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason: ReportReason,
    description: string
  ): Report {
    const report: Report = {
      id: uuidv4(),
      reporterId,
      targetType,
      targetId,
      reason,
      description,
      status: 'OPEN',
      priority: this.calculatePriority(reason, targetType),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reports = this.getReports();
    reports.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));

    return report;
  }

  /**
   * Obtiene todos los reportes
   */
  static getReports(): Report[] {
    const reports = localStorage.getItem(REPORTS_KEY);
    return reports ? JSON.parse(reports) : [];
  }

  /**
   * Obtiene reportes pendientes (OPEN, UNDER_REVIEW)
   */
  static getPendingReports(): Report[] {
    return this.getReports().filter(r => r.status === 'OPEN' || r.status === 'UNDER_REVIEW');
  }

  /**
   * Obtiene reportes de un usuario específico
   */
  static getUserReports(userId: string): Report[] {
    return this.getReports().filter(r => r.reporterId === userId);
  }

  /**
   * Obtiene reportes contra un objetivo específico
   */
  static getReportsAgainstTarget(targetType: ReportTargetType, targetId: string): Report[] {
    return this.getReports().filter(r => r.targetType === targetType && r.targetId === targetId);
  }

  /**
   * Actualiza el estado de un reporte
   */
  static updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorId?: string,
    resolution?: string
  ): Report | null {
    const reports = this.getReports();
    const index = reports.findIndex(r => r.id === reportId);

    if (index === -1) return null;

    reports[index] = {
      ...reports[index],
      status,
      assignedTo: moderatorId || reports[index].assignedTo,
      resolution,
      updatedAt: new Date().toISOString(),
      resolvedAt: status === 'CLOSED' || status === 'ACTION_TAKEN' || status === 'DISMISSED'
        ? new Date().toISOString()
        : reports[index].resolvedAt,
    };

    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    return reports[index];
  }

  /**
   * Asigna un reporte a un moderador
   */
  static assignReport(reportId: string, moderatorId: string): Report | null {
    return this.updateReportStatus(reportId, 'UNDER_REVIEW', moderatorId);
  }

  /**
   * Resuelve un reporte con acción tomada
   */
  static resolveWithAction(reportId: string, moderatorId: string, resolution: string): Report | null {
    return this.updateReportStatus(reportId, 'ACTION_TAKEN', moderatorId, resolution);
  }

  /**
   * Descarta un reporte
   */
  static dismissReport(reportId: string, moderatorId: string, resolution: string): Report | null {
    return this.updateReportStatus(reportId, 'DISMISSED', moderatorId, resolution);
  }

  /**
   * Escala un reporte a ADMIN/OWNER
   */
  static escalateReport(reportId: string, moderatorId: string): Report | null {
    return this.updateReportStatus(reportId, 'ESCALATED', moderatorId);
  }

  /**
   * Cierra un reporte
   */
  static closeReport(reportId: string, moderatorId: string, resolution: string): Report | null {
    return this.updateReportStatus(reportId, 'CLOSED', moderatorId, resolution);
  }

  /**
   * Calcula la prioridad basada en la razón y el tipo de objetivo
   */
  private static calculatePriority(reason: ReportReason, targetType: ReportTargetType): ReportPriority {
    // Razones críticas siempre son alta prioridad
    const criticalReasons: ReportReason[] = [
      'CHILD_SAFETY',
      'THREATS',
      'VIOLENCE',
      'SELF_HARM',
      'ILLEGAL_CONTENT',
    ];

    if (criticalReasons.includes(reason)) {
      return 'CRITICAL';
    }

    // Razones de alto impacto
    const highPriorityReasons: ReportReason[] = [
      'HARASSMENT',
      'HATEFUL_CONTENT',
      'SEXUAL_CONTENT',
      'FRAUD',
      'SCAM',
    ];

    if (highPriorityReasons.includes(reason)) {
      return 'HIGH';
    }

    // SPAM y otros son prioridad media
    if (reason === 'SPAM' || reason === 'IMPERSONATION') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Obtiene estadísticas de reportes
   */
  static getReportStats(): {
    total: number;
    open: number;
    underReview: number;
    resolved: number;
    dismissed: number;
    byPriority: Record<ReportPriority, number>;
    byReason: Record<ReportReason, number>;
  } {
    const reports = this.getReports();

    return {
      total: reports.length,
      open: reports.filter(r => r.status === 'OPEN').length,
      underReview: reports.filter(r => r.status === 'UNDER_REVIEW').length,
      resolved: reports.filter(r => r.status === 'ACTION_TAKEN' || r.status === 'CLOSED').length,
      dismissed: reports.filter(r => r.status === 'DISMISSED').length,
      byPriority: {
        LOW: reports.filter(r => r.priority === 'LOW').length,
        MEDIUM: reports.filter(r => r.priority === 'MEDIUM').length,
        HIGH: reports.filter(r => r.priority === 'HIGH').length,
        CRITICAL: reports.filter(r => r.priority === 'CRITICAL').length,
      },
      byReason: reports.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {} as Record<ReportReason, number>),
    };
  }

  /**
   * Verifica si un usuario ya reportó un objetivo específico
   */
  static hasUserReportedTarget(reporterId: string, targetType: ReportTargetType, targetId: string): boolean {
    return this.getReports().some(
      r => r.reporterId === reporterId && r.targetType === targetType && r.targetId === targetId
    );
  }
}
