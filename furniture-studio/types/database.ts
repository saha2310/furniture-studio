// Типы таблиц Supabase. При изменении схемы (supabase/migrations) — обновить вручную,
// либо сгенерировать через `supabase gen types typescript` и заменить этот файл.

export type WorkStatus = 'draft' | 'published';

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
          image_path: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          image_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      works: {
        Row: {
          id: string;
          category_id: string;
          title: string;
          slug: string;
          description: string | null;
          price: string | null;
          specs: Record<string, string> | null;
          cover_image_id: string | null;
          is_featured: boolean;
          sort_order: number;
          status: WorkStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          title: string;
          slug: string;
          description?: string | null;
          price?: string | null;
          specs?: Record<string, string> | null;
          cover_image_id?: string | null;
          is_featured?: boolean;
          sort_order?: number;
          status?: WorkStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['works']['Insert']>;
      };
      work_images: {
        Row: {
          id: string;
          work_id: string;
          storage_path: string;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_id: string;
          storage_path: string;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['work_images']['Insert']>;
      };
      site_settings: {
        Row: {
          id: number;
          company_name: string | null;
          logo_path: string | null;
          favicon_path: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          seo_default_title: string | null;
          seo_default_description: string | null;
          og_image_path: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['site_settings']['Row']> & { id?: number };
        Update: Partial<Database['public']['Tables']['site_settings']['Row']>;
      };
      contact_links: {
        Row: {
          id: string;
          platform: string;
          label: string;
          url: string;
          icon_key: string | null;
          is_visible: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          platform: string;
          label: string;
          url: string;
          icon_key?: string | null;
          is_visible?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contact_links']['Insert']>;
      };
      home_sections: {
        Row: {
          id: string;
          key: string;
          title: string | null;
          subtitle: string | null;
          content_json: Record<string, unknown> | null;
          is_visible: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          title?: string | null;
          subtitle?: string | null;
          content_json?: Record<string, unknown> | null;
          is_visible?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['home_sections']['Insert']>;
      };
      site_menu_items: {
        Row: {
          id: string;
          label: string;
          href: string;
          sort_order: number;
          is_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          href: string;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['site_menu_items']['Insert']>;
      };
      contact_requests: {
        Row: {
          id: string;
          name: string;
          contact: string;
          request_type: string | null;
          comment: string | null;
          status: 'new' | 'in_progress' | 'done';
          source_page: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact: string;
          request_type?: string | null;
          comment?: string | null;
          status?: 'new' | 'in_progress' | 'done';
          source_page?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contact_requests']['Insert']>;
      };
    };
  };
}
