/**
 * SafeDateHelper - Utility để xử lý Date một cách an toàn
 * 
 * Vấn đề: Khi gọi `new Date(date)` với date đã là Date object,
 * nếu date không hợp lệ → RangeError: Invalid time value
 * 
 * Giải pháp: Helper này kiểm tra & convert tự động
 */

export class SafeDateHelper {
  /**
   * Convert input to valid Date object
   * @param input - string | number | Date
   * @returns Date object hoặc null nếu invalid
   */
  static toDate(input: any): Date | null {
    // Nếu đã là Date
    if (input instanceof Date) {
      // Kiểm tra nó có hợp lệ không
      if (isNaN(input.getTime())) {
        console.warn('Invalid Date object:', input);
        return null;
      }
      return input;
    }

    // Nếu là string hoặc number
    if (typeof input === 'string' || typeof input === 'number') {
      try {
        const date = new Date(input);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date input:', input);
          return null;
        }
        return date;
      } catch (error) {
        console.error('Error converting date:', input, error);
        return null;
      }
    }

    // Nếu null/undefined
    if (input === null || input === undefined) {
      return null;
    }

    console.warn('Unexpected date input type:', typeof input, input);
    return null;
  }

  /**
   * Format date an toàn theo locale Việt Nam
   * @param input - Date | string | number
   * @param options - các tùy chọn format
   * @returns String format hoặc empty string nếu invalid
   * 
   * @example
   * SafeDateHelper.formatDate('2026-03-21') // "21/03/2026"
   * SafeDateHelper.formatDateTime('2026-03-21T10:30:00') // "21/03/2026 10:30"
   * SafeDateHelper.format(new Date(), { month: 'long' }) // "tháng 3"
   */
  static formatDate(input: any, options?: Intl.DateTimeFormatOptions): string {
    const date = this.toDate(input);
    if (!date) {
      console.warn('Cannot format invalid date:', input);
      return '';
    }

    try {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
      };

      return new Intl.DateTimeFormat('vi-VN', defaultOptions).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Format date + time
   * @example SafeDateHelper.formatDateTime('2026-03-21T10:30:00') // "21/03/2026 10:30"
   */
  static formatDateTime(input: any): string {
    return this.formatDate(input, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format chỉ thời gian (HH:MM)
   * @example SafeDateHelper.formatTime('2026-03-21T10:30:00') // "10:30"
   */
  static formatTime(input: any): string {
    return this.formatDate(input, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format theo template tùy chỉnh (dd/MM/yyyy HH:mm)
   * @example SafeDateHelper.formatCustom('2026-03-21T10:30:00') // "21/03/2026 10:30"
   */
  static formatCustom(
    input: any,
    template: string = 'dd/MM/yyyy HH:mm'
  ): string {
    const date = this.toDate(input);
    if (!date) return '';

    try {
      const d = String(date.getDate()).padStart(2, '0');
      const M = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const H = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');

      return template
        .replace('dd', d)
        .replace('MM', M)
        .replace('yyyy', String(y))
        .replace('HH', H)
        .replace('mm', mm)
        .replace('ss', s);
    } catch (error) {
      console.error('Error in formatCustom:', error);
      return '';
    }
  }

  /**
   * Get relative time (ví dụ: "2 giờ trước", "ngày hôm qua")
   * @example SafeDateHelper.getRelativeTime('2026-03-21T10:30:00')
   */
  static getRelativeTime(input: any): string {
    const date = this.toDate(input);
    if (!date) return '';

    try {
      const formatter = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (Math.abs(diffDays) < 1) {
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        if (Math.abs(diffHours) < 1) {
          const diffMinutes = Math.round(diffMs / (1000 * 60));
          return formatter.format(diffMinutes, 'minute');
        }
        return formatter.format(diffHours, 'hour');
      }

      return formatter.format(diffDays, 'day');
    } catch (error) {
      console.error('Error in getRelativeTime:', error);
      return '';
    }
  }

  /**
   * Kiểm tra date có hợp lệ không
   */
  static isValid(input: any): boolean {
    return this.toDate(input) !== null;
  }

  /**
   * Lấy timestamp (milliseconds)
   */
  static getTime(input: any): number | null {
    const date = this.toDate(input);
    return date ? date.getTime() : null;
  }

  /**
   * Compare hai dates
   * @returns -1: date1 < date2, 0: bằng nhau, 1: date1 > date2
   */
  static compare(date1: any, date2: any): number {
    const d1 = this.toDate(date1);
    const d2 = this.toDate(date2);

    if (!d1 || !d2) return 0;

    const t1 = d1.getTime();
    const t2 = d2.getTime();

    return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;
  }

  /**
   * Lấy ngày hôm nay (00:00:00)
   */
  static today(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Lấy ngày mai
   */
  static tomorrow(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Lấy ngày hôm qua
   */
  static yesterday(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Thêm ngày vào date
   * @example SafeDateHelper.addDays(new Date(), 7) // ngày hôm nay + 7 ngày
   */
  static addDays(input: any, days: number): Date | null {
    const date = this.toDate(input);
    if (!date) return null;

    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Thêm giờ vào date
   */
  static addHours(input: any, hours: number): Date | null {
    const date = this.toDate(input);
    if (!date) return null;

    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Lấy timestamp key cho groupBy (VD: "2026-03-21")
   * @example SafeDateHelper.toDateKey(new Date()) // "2026-03-21"
   */
  static toDateKey(input: any): string {
    const date = this.toDate(input);
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Parse date key thành Date object
   * @example SafeDateHelper.fromDateKey("2026-03-21") // Date object
   */
  static fromDateKey(dateKey: string): Date | null {
    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing dateKey:', dateKey, error);
      return null;
    }
  }
}
