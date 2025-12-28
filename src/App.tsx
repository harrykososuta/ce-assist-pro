import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity, Droplet, Search, Calculator, ArrowLeft, Info,
  ShieldAlert, ChevronRight, Settings, AlertTriangle, X,
  Beaker, CheckCircle, AlertOctagon, Filter, FileSpreadsheet,
  Layers, Stethoscope, RefreshCw, ArrowRightLeft, Upload, FileText, Trash2, Download, Database,
  BookOpen, Thermometer, User, FileOutput, FlaskConical, Syringe, Plus
} from 'lucide-react';

// --- Global Styles ---
const CustomStyles = () => (
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-out forwards;
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `}</style>
);

// --- Type Definitions ---
type ViewMode = 'top_menu' | 'hemodialysis_menu' | 'manufacturer' | 'classification' | 'treatment' | 'apheresis_menu' | 'apheresis_list' | 'column_list' | 'apheresis_disease';
type ProductType = 'dialyzer' | 'hemodiafilter' | 'column';
type ApheresisType = 'CRRT' | 'PE' | 'DFPP' | 'PA' | 'DHP' | 'CART';

type JSDTClass = 'Ⅰa' | 'Ⅰb' | 'Ⅱa' | 'Ⅱb' | 'S' | '特定積層型';
type HDFClass = 'Alb低漏出' | 'Alb中漏出' | 'Alb高漏出' | '吸着型';

interface DialyzerSpec {
  area: number;
  ufr: number;
  vol: number;
  clearance: {
    ure: number;
    b2mg?: number;
    phos?: number;
    b12?: number; 
  };
}

interface DialyzerSeries {
  id: string;
  name: string;
  maker: string;
  type: ProductType; 
  jsdtClass?: JSDTClass;
  hdfClass?: HDFClass;
  material: string;
  pvp: string; 
  bpa: string; 
  sterilization: string; 
  features: string[];
  specs: { [key: number]: DialyzerSpec }; 
}

interface ApheresisDevice {
  id: string;
  name: string;
  maker: string;
  type: string;
  category: ApheresisType | 'COLUMN'; 
  material?: string;
  indication: string[];
  contraindication?: string[];
  items: string[];
  priming: {
    steps: string[];
    vol_blood: number | string;
    vol_wash: string;
  };
  treatment: {
    qb: string;
    qd?: string;
    time?: string;
    notes: string[];
  };
  finish: {
    method: string;
    vol: string;
  };
  insurance: string;
}

// --- Data Constants ---
const REIMBURSEMENT_INFO = {
  CRRT: {
    title: "持続緩徐式血液濾過 (J038-2)",
    points: "1,990点 / 1日につき",
    material: [
      { name: "持続緩徐式血液濾過器 (標準型・一般用)", price: "27,000円 (1日につき)" },
      { name: "対象製品", list: ["キュアフローA", "ヴィライフ", "エクセルフロー", "セプザイリス"] }
    ],
    notes: [
      "時間外・休日加算: +300点",
      "障害者等加算: +120点",
      "夜間開始(午後5時以降)等の規定あり",
      "人工腎臓(J038)と併せて月14回限度 (例外あり)",
      "適応: 末期腎不全、AKI、薬物中毒、重症膵炎、重症敗血症、劇症肝炎/術後肝不全"
    ]
  },
  PE: {
    title: "血漿交換療法 (J039)",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿交換用血漿分離器", price: "30,200円" },
      { name: "対象製品", list: ["プラズマフローOP", "サルフラックスFP", "エバキュアープラス"] }
    ],
    notes: [
      "適応疾患により実施回数・期間制限が異なる",
      "多発性骨髄腫・マクログロブリン血症: 週1回 (3ヶ月限度)",
      "劇症肝炎: 一連につき概ね10回限度",
      "術後肝不全: 一連につき概ね7回限度"
    ]
  },
  DFPP: {
    title: "血漿交換療法 (J039) - 二重濾過法",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿交換用血漿分離器", price: "30,200円" },
      { name: "血漿交換用血漿成分分離器", price: "23,700円" },
      { name: "対象製品", list: ["カスケードフローEC"] }
    ],
    notes: [
      "家族性高コレステロール血症、ABO不適合移植、免疫神経疾患等",
      "原則として血漿補充を要しない場合が多い"
    ]
  },
  PA: {
    title: "血漿交換療法 (J039) - 血漿吸着法",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿分離器", price: "30,200円" },
      { name: "選択的血漿成分吸着器(劇症肝炎用)", price: "69,900円" },
      { name: "選択的血漿成分吸着器(劇症肝炎用以外)", price: "83,600円" }
    ],
    notes: [
      "劇症肝炎・術後肝不全 (BRS)",
      "家族性高コレステロール血症、ASO、巣状糸球体硬化症 (リポソーバー)",
      "重症筋無力症、SLE、RA等 (イムソーバ)"
    ]
  },
  DHP: {
    title: "吸着式血液浄化法 / 血球成分除去療法",
    points: "2,000点 (J041) / 2,000点 (J041-2)",
    material: [
      { name: "吸着式血液浄化用浄化器 (中毒等)", price: "133,000円" },
      { name: "吸着型血液浄化器 (閉塞性動脈硬化症用)", price: "172,000円" },
      { name: "エンドトキシン選択的吸着(DHP)", price: "365,000円" },
      { name: "血球細胞除去用浄化器", price: "172,000円" }
    ],
    notes: [
      "【J041 吸着式血液浄化法】: 肝性昏睡または薬物中毒",
      "【J041-2 血球成分除去療法】: 潰瘍性大腸炎 (イムノピュア/アダカラム)。一連につき10回限度(週1回)。",
      "【アダカラムの敗血症適応】: 敗血症で集学的治療が必要な場合。1日3個、一連につき5個限度。"
    ]
  },
  COLUMN: {
    title: "人工腎臓 (J038) + 特定保険医療材料",
    points: "人工腎臓の所定点数に含まれる (材料は別算定)",
    material: [
      { name: "人工腎臓用特定保険医療材料（β2-MG吸着器）", price: "29,900円" },
      { name: "対象製品", list: ["リクセル", "フィルトール"] }
    ],
    notes: [
      "透析アミロイドーシス患者に対し、疼痛やADLの改善等を目的として使用する場合に算定。",
      "認定施設基準（透析アミロイドーシスに対する吸着型血液浄化器の施設基準）あり。"
    ]
  },
  CART: {
    title: "胸水・腹水濾過濃縮再静注法 (K635)",
    points: "3,950点 / 1回につき",
    material: [
      { name: "腹水濾過器", price: "32,400円 (参考)" },
      { name: "腹水濃縮器", price: "38,700円 (参考)" },
      { name: "対象製品", list: ["AHF-MOW", "AHF-UF", "マスキュア"] }
    ],
    notes: [
      "難治性腹水症または難治性胸水症の患者に対し、濾過・濃縮して再静注した場合に算定。",
      "月2回を限度とする（ただし、治療上の必要性がある場合には月4回まで算定可）。"
    ]
  }
};

const DIALYZER_DB: DialyzerSeries[] = [
    {
    id: 'baxter-h12', name: 'H12 シリーズ', maker: 'バクスター', type: 'dialyzer', jsdtClass: '特定積層型', material: 'PAN (ポリアクリロニトリル)', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['積層型(プレート)', 'ACE阻害薬併用禁忌', '陰性荷電'],
    specs: { 2800: { area: 1.04, ufr: 20, vol: 64, clearance: { ure: 180 } }, 3400: { area: 1.25, ufr: 25, vol: 76, clearance: { ure: 190 } }, 4000: { area: 1.53, ufr: 30, vol: 92, clearance: { ure: 198 } } }
  },
  {
    id: 'nipro-fb-eco', name: 'FB-eco シリーズ', maker: 'ニプロ', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'CTA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['ドライタイプ', '軽量化ハウジング', 'BPAフリー', 'PVPフリー'],
    specs: { 0.5: { area: 0.5, ufr: 10, vol: 35, clearance: { ure: 130 } }, 1.5: { area: 1.5, ufr: 26, vol: 90, clearance: { ure: 188 } }, 2.1: { area: 2.1, ufr: 39, vol: 125, clearance: { ure: 198 } }, 2.5: { area: 2.5, ufr: 47, vol: 145, clearance: { ure: 200 } } }
  },
  {
    id: 'nipro-fa-d-eco', name: 'FA-D eco (ファインネフロン)', maker: 'ニプロ', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'CTA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['PVPフリー', 'BPAフリー', 'アレルギーリスク低減'],
    specs: { 1.5: { area: 1.5, ufr: 35, vol: 90, clearance: { ure: 190, b2mg: 30 } }, 2.1: { area: 2.1, ufr: 45, vol: 125, clearance: { ure: 198, b2mg: 40 } } }
  },
  {
    id: 'nipro-pes-alpha-eco', name: 'PES-α eco (ポリネフロン)', maker: 'ニプロ', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'PES (ポリエーテルスルホン)', pvp: '○', bpa: '-', sterilization: 'γ線', features: ['ポリエーテルスルホン膜', 'ガンマ線滅菌', '豊富なサイズラインナップ'],
    specs: { 
      0.9: { area: 0.9, ufr: 20, vol: 53, clearance: { ure: 170 } }, 
      1.1: { area: 1.1, ufr: 25, vol: 68, clearance: { ure: 180 } }, 
      1.3: { area: 1.3, ufr: 30, vol: 78, clearance: { ure: 185 } },
      1.5: { area: 1.5, ufr: 50, vol: 93, clearance: { ure: 192, b2mg: 60 } }, 
      1.7: { area: 1.7, ufr: 55, vol: 108, clearance: { ure: 195 } },
      1.9: { area: 1.9, ufr: 60, vol: 118, clearance: { ure: 197 } },
      2.1: { area: 2.1, ufr: 60, vol: 128, clearance: { ure: 199, b2mg: 70 } },
      2.5: { area: 2.5, ufr: 65, vol: 148, clearance: { ure: 200 } }
    }
  },
  {
    id: 'asahi-aps-ua', name: 'APS-UA Series', maker: '旭化成', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (ポリスルホン)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['生体適合性・抗血栓性', 'Alb漏出抑制', 'ウェービング糸'],
    specs: { 1.5: { area: 1.5, ufr: 42, vol: 82, clearance: { ure: 196, b12: 140, phos: 185 } }, 2.1: { area: 2.1, ufr: 48, vol: 112, clearance: { ure: 199, b12: 158, phos: 192 } } }
  },
  {
    id: 'asahi-aps-ma', name: 'APS-MA Series', maker: '旭化成', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (ポリスルホン)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['Alb漏出抑制', '小分子除去性能'],
    specs: { 1.5: { area: 1.5, ufr: 56, vol: 88, clearance: { ure: 194, b12: 142, phos: 183 } }, 2.1: { area: 2.1, ufr: 75, vol: 119, clearance: { ure: 198, b12: 160, phos: 192 } } }
  },
  {
    id: 'asahi-aps-sa-nx', name: 'APS-SA NX Series', maker: '旭化成', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (ポリスルホン)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['小分子溶質の高除去', 'ウェービング糸', '軽量化容器(NX)'],
    specs: { 1.5: { area: 1.5, ufr: 60, vol: 84, clearance: { ure: 196, b12: 139, phos: 196 } }, 2.1: { area: 2.1, ufr: 84, vol: 116, clearance: { ure: 198, b12: 156, phos: 199 } } }
  },
  {
    id: 'asahi-aps-ea-nx', name: 'APS-EA NX Series', maker: '旭化成', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'PS (ポリスルホン)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['中分子除去とAlb漏出抑制のバランス', '軽量化容器(NX)'],
    specs: { 1.5: { area: 1.5, ufr: 63, vol: 84, clearance: { ure: 196, b12: 144, phos: 184 } }, 2.1: { area: 2.1, ufr: 87, vol: 116, clearance: { ure: 198, b12: 160, phos: 192 } } }
  },
  {
    id: 'asahi-vps-ha', name: 'VPS-HA Series (旭ビタブレン)', maker: '旭化成', type: 'dialyzer', jsdtClass: 'S', material: 'Vit.E固定化PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['ビタミンE固定化', '抗酸化作用', '小分子除去性能'],
    specs: { 1.5: { area: 1.5, ufr: 63, vol: 82, clearance: { ure: 196, b12: 138, phos: 182 } }, 2.1: { area: 2.1, ufr: 74, vol: 112, clearance: { ure: 198, b12: 156, phos: 194 } } }
  },
  {
    id: 'asahi-vps-va', name: 'VPS-VA Series (旭ビタブレン)', maker: '旭化成', type: 'dialyzer', jsdtClass: 'S', material: 'Vit.E固定化PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['ビタミンE固定化', '中分子除去向上', '抗酸化作用'],
    specs: { 1.5: { area: 1.5, ufr: 61, vol: 88, clearance: { ure: 194, b12: 141, phos: 183 } }, 2.1: { area: 2.1, ufr: 81, vol: 119, clearance: { ure: 198, b12: 159, phos: 191 } } }
  },
  {
    id: 'toray-nv-s', name: 'NV-S (トレライトNV)', maker: '東レ', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (親水化/NVポリマー)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['抗血栓性', '生体適合性', '吸着水制御'],
    specs: { 1.3: { area: 1.3, ufr: 35, vol: 82, clearance: { ure: 180, b2mg: 20 } }, 1.8: { area: 1.8, ufr: 45, vol: 108, clearance: { ure: 190, b2mg: 25 } } }
  },
  {
    id: 'toray-nv-u', name: 'NV-U (トレライトNV)', maker: '東レ', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (親水化/NVポリマー)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['抗血栓性', '中分子除去バランス'],
    specs: { 1.3: { area: 1.3, ufr: 46, vol: 84, clearance: { ure: 188, b2mg: 30 } }, 1.8: { area: 1.8, ufr: 52, vol: 111, clearance: { ure: 198, b2mg: 40 } } }
  },
  {
    id: 'toray-nv-x', name: 'NV-X (トレライトNV)', maker: '東レ', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'PS (親水化/NVポリマー)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['抗血栓性', 'IIa型', '除去性能向上'],
    specs: { 1.5: { area: 1.5, ufr: 49, vol: 96, clearance: { ure: 197, b2mg: 40, b12: 158 } }, 2.1: { area: 2.1, ufr: 54, vol: 130, clearance: { ure: 199, b2mg: 50, b12: 173 } } }
  },
  {
    id: 'toray-nf', name: 'フィルトライザー NF', maker: '東レ', type: 'dialyzer', jsdtClass: 'S', material: 'PMMA (吸着特性)', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['PMMA膜', '蛋白吸着', '抗炎症'],
    specs: { 1.6: { area: 1.6, ufr: 48, vol: 103, clearance: { ure: 190, b2mg: 60 } }, 2.1: { area: 2.1, ufr: 59, vol: 135, clearance: { ure: 196, b2mg: 70 } } }
  },
  {
    id: 'toray-bg', name: 'フィルトライザー BG', maker: '東レ', type: 'dialyzer', jsdtClass: 'S', material: 'PMMA (弱カチオン)', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['弱カチオン性', 'サイトカイン吸着'],
    specs: { 1.6: { area: 1.6, ufr: 40, vol: 103, clearance: { ure: 188, b2mg: 55 } }, 2.1: { area: 2.1, ufr: 55, vol: 135, clearance: { ure: 195, b2mg: 65 } } }
  },
  {
    id: 'toray-bk', name: 'フィルトライザー BK', maker: '東レ', type: 'dialyzer', jsdtClass: 'S', material: 'PMMA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['生体適合性', '標準的PMMA'],
    specs: { 1.3: { area: 1.3, ufr: 27, vol: 83, clearance: { ure: 175 } }, 1.6: { area: 1.6, ufr: 31, vol: 103, clearance: { ure: 184 } } }
  },
  {
    id: 'nikkiso-fdx', name: 'FDX', maker: '日機装', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PEPA', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['PEPA膜', '高強度', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 40, vol: 90, clearance: { ure: 188, b2mg: 25 } }, 2.1: { area: 2.1, ufr: 55, vol: 130, clearance: { ure: 195, b2mg: 35 } } }
  },
  {
    id: 'nikkiso-fdy', name: 'FDY', maker: '日機装', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PEPA', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['PEPA膜', '小分子除去', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 45, vol: 90, clearance: { ure: 192, b2mg: 30 } } }
  },
  {
    id: 'nikkiso-fdw', name: 'FDW', maker: '日機装', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'PEPA', pvp: '-', bpa: '○', sterilization: 'γ線', features: ['PVPフリー', '中分子除去', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 55, vol: 90, clearance: { ure: 195, b2mg: 45 } } }
  },
  {
    id: 'nikkiso-fdz', name: 'FDZ', maker: '日機装', type: 'dialyzer', jsdtClass: 'Ⅱb', material: 'PEPA', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['高機能型', 'β2-MG高除去'],
    specs: { 1.5: { area: 1.5, ufr: 65, vol: 90, clearance: { ure: 198, b2mg: 60 } } }
  },
  {
    id: 'nikkiso-flx', name: 'FLX', maker: '日機装', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PEPA (PVPフリー)', pvp: '-', bpa: '○', sterilization: 'γ線', features: ['PVPフリー', '抗酸化性', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 45, vol: 90, clearance: { ure: 190, b2mg: 20 } } }
  },
  {
    id: 'nikkiso-fx', name: 'FX', maker: '日機装 (Fresenius)', type: 'dialyzer', jsdtClass: 'Ⅰa', material: 'PS (Helixone)', pvp: '○', bpa: '○', sterilization: 'AC', features: ['Helixone膜', 'インライン蒸気滅菌', 'ドライタイプ'],
    specs: { 1.4: { area: 1.4, ufr: 48, vol: 74, clearance: { ure: 193, b2mg: 30 } }, 1.8: { area: 1.8, ufr: 59, vol: 98, clearance: { ure: 197, b2mg: 40 } } }
  },
  {
    id: 'nikkiso-fx-s', name: 'FX-S / CorDiax', maker: '日機装 (Fresenius)', type: 'dialyzer', jsdtClass: 'Ⅱa', material: 'PS (Helixone)', pvp: '○', bpa: '○', sterilization: 'AC', features: ['Helixone Plus', '中分子除去強化'],
    specs: { 1.4: { area: 1.4, ufr: 55, vol: 74, clearance: { ure: 195, b2mg: 55 } }, 1.8: { area: 1.8, ufr: 68, vol: 98, clearance: { ure: 198, b2mg: 65 } } }
  },
  {
    id: 'nipro-fix-e-eco', name: 'FIX-E eco', maker: 'ニプロ', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'CTA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['HDF用', 'PVPフリー', 'BPAフリー', 'Albロス抑制'],
    specs: { 1.5: { area: 1.5, ufr: 65, vol: 90, clearance: { ure: 195, b2mg: 65 } }, 2.1: { area: 2.1, ufr: 81, vol: 125, clearance: { ure: 200, b2mg: 75 } } }
  },
  {
    id: 'nipro-fix-s-eco', name: 'FIX-S eco', maker: 'ニプロ', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'CTA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['小分子除去重視', 'マイルドHDF'],
    specs: { 1.5: { area: 1.5, ufr: 50, vol: 90, clearance: { ure: 190, b2mg: 50 } } }
  },
  {
    id: 'nipro-fix-u-eco', name: 'FIX-U eco', maker: 'ニプロ', type: 'hemodiafilter', hdfClass: 'Alb高漏出', material: 'CTA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['大孔径', '高効率HDF', '大量液置換対応'],
    specs: { 2.1: { area: 2.1, ufr: 90, vol: 125, clearance: { ure: 202, b2mg: 82 } } }
  },
  {
    id: 'nipro-mfx-w-eco', name: 'MFX-W eco', maker: 'ニプロ', type: 'hemodiafilter', hdfClass: 'Alb中漏出', material: 'PES', pvp: '○', bpa: '-', sterilization: 'γ線', features: ['PES膜HDF', '高透水性', 'BPAフリー'],
    specs: { 1.5: { area: 1.5, ufr: 60, vol: 93, clearance: { ure: 193, b2mg: 70 } }, 2.1: { area: 2.1, ufr: 75, vol: 128, clearance: { ure: 199, b2mg: 78 } } }
  },
  {
    id: 'asahi-abh-pa', name: 'ABH-PA Series', maker: '旭化成', type: 'hemodiafilter', hdfClass: 'Alb中漏出', material: 'PS (ポリスルホン)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['大膜面積(2.6㎡)あり', '低分子量蛋白除去', '高透水性'],
    specs: { 1.5: { area: 1.5, ufr: 77, vol: 92, clearance: { ure: 239, b12: 158, phos: 216 } }, 2.2: { area: 2.2, ufr: 108, vol: 131, clearance: { ure: 244, b12: 183, phos: 230 } } }
  },
  {
    id: 'asahi-v-ta', name: 'V-TA Series', maker: '旭化成', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'Vit.E固定化PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['ビタミンE固定化', 'Alb漏出抑制', '抗酸化作用'],
    specs: { 1.5: { area: 1.5, ufr: 64, vol: 92, clearance: { ure: 241, b12: 168, phos: 221 } }, 2.2: { area: 2.2, ufr: 93, vol: 131, clearance: { ure: 248, b12: 200, phos: 239 } } }
  },
  {
    id: 'asahi-v-ra', name: 'V-RA Series', maker: '旭化成', type: 'hemodiafilter', hdfClass: 'Alb中漏出', material: 'Vit.E固定化PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['ビタミンE固定化', 'ABHの除去性能継承', '抗酸化作用'],
    specs: { 1.5: { area: 1.5, ufr: 73, vol: 92, clearance: { ure: 239, b12: 169, phos: 221 } }, 2.2: { area: 2.2, ufr: 102, vol: 131, clearance: { ure: 248, b12: 199, phos: 240 } } }
  },
  {
    id: 'toray-nvf-m', name: 'NVF-M', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'PS (親水化)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['モイストタイプ', '低漏出', '抗血栓性'],
    specs: { 1.5: { area: 1.5, ufr: 66, vol: 96, clearance: { ure: 242, b2mg: 70 } }, 2.1: { area: 2.1, ufr: 71, vol: 130, clearance: { ure: 247, b2mg: 80 } } }
  },
  {
    id: 'toray-nvf-h', name: 'NVF-H', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb中漏出', material: 'PS (親水化)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['モイストタイプ', '中漏出', 'バランス'],
    specs: { 2.1: { area: 2.1, ufr: 80, vol: 130, clearance: { ure: 247, b2mg: 85 } } }
  },
  {
    id: 'toray-nvf-p', name: 'NVF-P', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb高漏出', material: 'PS (親水化)', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['モイストタイプ', '高漏出', '大量液置換'],
    specs: { 2.1: { area: 2.1, ufr: 90, vol: 130, clearance: { ure: 248, b2mg: 90 } } }
  },
  {
    id: 'toray-tdf-mv', name: 'トレスルホン TDF-MV', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['MVタイプ', '生体適合性'],
    specs: { 1.7: { area: 1.7, ufr: 69, vol: 108, clearance: { ure: 242, b2mg: 70 } }, 2.0: { area: 2.0, ufr: 77, vol: 130, clearance: { ure: 245, b2mg: 75 } } }
  },
  {
    id: 'toray-tdf-hv', name: 'トレスルホン TDF-HV', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb中漏出', material: 'PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['HVタイプ', '高除去'],
    specs: { 2.0: { area: 2.0, ufr: 93, vol: 130, clearance: { ure: 247, b2mg: 85 } } }
  },
  {
    id: 'toray-tdf-pv', name: 'トレスルホン TDF-PV', maker: '東レ', type: 'hemodiafilter', hdfClass: 'Alb高漏出', material: 'PS', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['PVタイプ', '高性能'],
    specs: { 2.0: { area: 2.0, ufr: 100, vol: 130, clearance: { ure: 248, b2mg: 90 } } }
  },
  {
    id: 'toray-pmf-a', name: 'PMF-A', maker: '東レ', type: 'hemodiafilter', hdfClass: '吸着型', material: 'PMMA', pvp: '-', bpa: '-', sterilization: 'γ線', features: ['吸着特性', '炎症性サイトカイン吸着'],
    specs: { 1.6: { area: 1.6, ufr: 37, vol: 103, clearance: { ure: 222, b2mg: 60 } }, 2.1: { area: 2.1, ufr: 56, vol: 135, clearance: { ure: 232, b2mg: 70 } } }
  },
  {
    id: 'nikkiso-gdf-m', name: 'GDF-M', maker: '日機装', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'PEPA', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['PEPA膜HDF', '低漏出', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 60, vol: 90, clearance: { ure: 196, b2mg: 65 } } }
  },
  {
    id: 'nikkiso-gdf', name: 'GDF', maker: '日機装', type: 'hemodiafilter', hdfClass: 'Alb高漏出', material: 'PEPA', pvp: '○', bpa: '○', sterilization: 'γ線', features: ['PEPA膜HDF', '高漏出', 'ウェットタイプ'],
    specs: { 1.5: { area: 1.5, ufr: 75, vol: 90, clearance: { ure: 198, b2mg: 75 } } }
  },
  {
    id: 'nikkiso-fx-hdf', name: 'FX-HDF', maker: '日機装 (Fresenius)', type: 'hemodiafilter', hdfClass: 'Alb低漏出', material: 'PS (Helixone)', pvp: '○', bpa: '○', sterilization: 'AC', features: ['Helixone膜', 'インライン蒸気滅菌', 'ドライタイプ'],
    specs: { 1.4: { area: 1.4, ufr: 62, vol: 80, clearance: { ure: 195, b2mg: 65 } }, 1.8: { area: 1.8, ufr: 80, vol: 105, clearance: { ure: 198, b2mg: 72 } } }
  }
];

const APHERESIS_DEVICES: ApheresisDevice[] = [
  {
    id: 'sepxiris', name: 'セプザイリス (SepXiris)', maker: 'バクスター', category: 'CRRT', type: '持続緩徐式血液濾過器', material: 'AN69ST (表面処理PAN)', indication: ['敗血症', '敗血症性ショック'], items: ['セプザイリス本体', 'CRRT回路'],
    priming: { steps: ['ヘパリン加生食1500mL洗浄', '濾過側の脱気注意'], vol_blood: '60:69mL / 100:107mL', vol_wash: '1500mL以上' },
    treatment: { qb: '50-200 mL/min', notes: ['サイトカイン(IL-6)吸着能あり', 'AN69ST膜による吸着'] },
    finish: { method: '生食返血', vol: '500 mL' }, insurance: 'J038-2 持続緩徐式血液濾過器'
  },
  {
    id: 'lixelle', name: 'リクセル (Lixelle)', maker: 'カネカ', category: 'COLUMN', type: 'β2-MG吸着カラム', material: 'セルロースビーズ+ヘキサデシル基', indication: ['透析アミロイドーシス'], items: ['リクセル本体', '専用接続回路'],
    priming: { steps: ['透析器と直列接続', '生食1000mL以上で洗浄', '気泡除去'], vol_blood: 'S-15:135mL / S-35:177mL', vol_wash: '1000mL以上' },
    treatment: { qb: '200 mL/min (透析条件に準ずる)', notes: ['ACE阻害薬併用注意', '開始直後の血圧低下に注意'] },
    finish: { method: '生食返血', vol: '150-200 mL' }, insurance: '特定保険医療材料 (β2-MG吸着器)'
  },
  {
    id: 'filtor', name: 'フィルトール (Filtor)', maker: '東レ', category: 'COLUMN', type: 'β2-MG吸着カラム', material: '架橋高分子', indication: ['透析アミロイドーシス'], items: ['フィルトール本体'],
    priming: { steps: ['透析器と直列接続', '生食洗浄'], vol_blood: 'FT-75:50mL / FT-145:95mL', vol_wash: '500-1000mL' },
    treatment: { qb: '200 mL/min', notes: ['β2-MGを選択的に吸着', 'タンパク吸着特性あり'] },
    finish: { method: '生食返血', vol: '-' }, insurance: '特定保険医療材料 (β2-MG吸着器)'
  },
  {
    id: 'rheocarna', name: 'レオカーナ (Rheocarna)', maker: 'カネカ', category: 'DHP', type: '吸着型血液浄化器', material: 'セルロースビーズ(デキストラン硫酸+トリプトファン)', indication: ['閉塞性動脈硬化症 (潰瘍・壊疽を有する)'], items: ['レオカーナ本体', '血液回路'],
    priming: { steps: ['生食洗浄', 'ヘパリン加生食充填', '気泡除去'], vol_blood: '160mL', vol_wash: '1000mL以上' },
    treatment: { qb: '100-150 mL/min', notes: ['LDL及びフィブリノーゲンを吸着', '週1回・計10回まで(3ヶ月以内)', 'ACE阻害薬併用禁忌'] },
    finish: { method: '生食返血', vol: '-' }, insurance: '特定保険医療材料 (閉塞性動脈硬化症用)'
  },
  {
    id: 'hemosorba', name: 'ヘモソーバ CHS', maker: '旭化成', category: 'DHP', type: '血液吸着器', material: '活性炭 (HEMAコート)', indication: ['肝性昏睡', '薬物中毒'], items: ['ヘモソーバ本体', 'DHP回路'],
    priming: { steps: ['ヘパリン生食洗浄', '叩き出し推奨', '気泡除去'], vol_blood: '190mL', vol_wash: '1000mL以上' },
    treatment: { qb: '100～150 mL/min', notes: ['血小板減少注意', 'グルコース吸着', '3時間以内'] },
    finish: { method: '生食返血', vol: '200mL' }, insurance: 'J048 吸着式血液浄化用浄化器'
  },
  {
    id: 'pmx', name: 'トレミキシン (PMX)', maker: '東レ', category: 'DHP', type: 'エンドトキシン吸着カラム', material: 'ポリミキシンB固定化繊維', indication: ['エンドトキシン血症', 'グラム陰性菌感染症'], items: ['トレミキシン本体', 'DHP回路'],
    priming: { steps: ['生食洗浄', '気泡除去'], vol_blood: '135mL (20R)', vol_wash: '4000mL以上推奨 (pH調整)' },
    treatment: { qb: '80～120 mL/min', notes: ['2時間還流', 'SIRS基準/SOFAスコア等の要件あり'] },
    finish: { method: '生食返血', vol: '-' }, insurance: '特定保険医療材料 (エンドトキシン除去用)'
  },
  {
    id: 'immunopure', name: 'イムノピュア', maker: '旭化成', category: 'DHP', type: '血球細胞除去用浄化器', material: '非晶性ポリアリレートビーズ', indication: ['潰瘍性大腸炎'], items: ['イムノピュア本体', '血液回路'],
    priming: { steps: ['生食2000mL洗浄', 'ヘパリン加生食置換'], vol_blood: '165mL', vol_wash: '2000mL + 500mL' },
    treatment: { qb: '30～50 mL/min', time: '60分間', notes: ['白血球吸着', '週1回'] },
    finish: { method: '生食返血', vol: '-' }, insurance: '特定保険医療材料'
  },
  {
    id: 'adacolumn', name: 'アダカラム', maker: 'JIMRO', category: 'DHP', type: '血球細胞除去用浄化器', material: '酢酸セルロースビーズ', indication: ['潰瘍性大腸炎', 'クローン病', '敗血症'], items: ['アダカラム本体', '血液回路'],
    priming: { steps: ['生食1500mL洗浄', '抗凝固剤添加生食置換'], vol_blood: '約200mL', vol_wash: '1500mL' },
    treatment: { qb: '30mL/min', time: '60分', notes: ['顆粒球・単球吸着', 'ACE阻害薬併用注意'] },
    finish: { method: '生食返血', vol: '100-300 mL' }, insurance: 'J041-2'
  },
  {
    id: 'liposorber', name: 'リポソーバー LA-15/40S', maker: 'カネカ', category: 'PA', type: 'LDL吸着器', material: 'デキストラン硫酸', indication: ['家族性高コレステロール血症', 'ASO', 'FGS', 'SLE'],
    items: ['リポソーバー本体', '血漿分離器', '吸着回路'],
    priming: { steps: ['生食洗浄', 'ヘパリン充填'], vol_blood: '150mL/400mL', vol_wash: '1000mL' },
    treatment: { qb: '血漿30-40 mL/min', notes: ['LDL-Cを選択的に吸着', 'ACE阻害薬禁忌'] },
    finish: { method: '血漿回収', vol: '-' }, insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'selesorb', name: 'セレソーブ', maker: 'カネカ', category: 'PA', type: '免疫吸着器', material: 'デキストラン硫酸固定化セルロースビーズ', indication: ['全身性エリテマトーデス (SLE)'],
    items: ['セレソーブ本体', '血漿分離器'],
    priming: { steps: ['生食洗浄', '抗凝固薬充填'], vol_blood: '150mL (TS-1300)', vol_wash: '1000mL' },
    treatment: { qb: '血漿20-30 mL/min', notes: ['抗DNA抗体/免疫複合体を除去', 'ACE阻害薬禁忌'] },
    finish: { method: '血漿回収', vol: '-' }, insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'plasorba', name: 'プラソーバ BRS', maker: '旭化成', category: 'PA', type: '血漿吸着器', material: '陰イオン交換樹脂', indication: ['劇症肝炎', '術後肝不全'],
    items: ['プラソーバ本体', '血漿分離器', '吸着回路'],
    priming: { steps: ['生食洗浄', 'ヘパリン加生食充填'], vol_blood: '110mL', vol_wash: '1000mL' },
    treatment: { qb: '血漿30-40 mL/min', notes: ['ビリルビン/胆汁酸吸着', 'クエン酸中毒注意'] },
    finish: { method: '血漿押し出し', vol: '-' }, insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'immusorba', name: 'イムソーバ TR / PH', maker: '旭化成', category: 'PA', type: '免疫吸着器', material: 'PVAゲル+リガンド', indication: ['TR:MG, MS, GBS', 'PH:SLE, RA'],
    items: ['イムソーバ本体', '血漿分離器', '吸着回路'],
    priming: { steps: ['保存液洗浄', '抗凝固薬充填'], vol_blood: '300mL', vol_wash: '2000mL以上' },
    treatment: { qb: '血漿流量 20～30 mL/min', notes: ['ACE阻害薬禁忌', '自己抗体除去'] },
    finish: { method: '血漿回収', vol: '-' }, insurance: 'J046 免疫反応性血漿成分吸着器'
  },
  {
    id: 'sulflux-fp', name: 'サルフラックス FP', maker: 'カネカ', category: 'PE', type: '血漿分離器', material: 'ポリエチレン', indication: ['肝不全', 'TTP'], items: ['サルフラックス本体'],
    priming: { steps: ['血液側・血漿側洗浄'], vol_blood: '55-80mL', vol_wash: '1000mL' },
    treatment: { qb: '80-150 mL/min', notes: ['TMP管理'] },
    finish: { method: '生食返血', vol: '-' }, insurance: 'J044'
  },
  {
    id: 'plasmaflo-op', name: 'プラズマフロー OP', maker: '旭化成', category: 'PE', type: '血漿分離器', material: 'ポリエチレン', indication: ['肝不全', 'TTP'], items: ['プラズマフロー本体'],
    priming: { steps: ['血液側洗浄', '濾過洗浄'], vol_blood: '55-80mL', vol_wash: '1000mL' },
    treatment: { qb: '80-150 mL/min', notes: ['目詰まり注意'] },
    finish: { method: '返血', vol: '100-200 mL' }, insurance: 'J044'
  },
  {
    id: 'evacure-plus', name: 'エバキュアープラス', maker: '旭化成', category: 'PE', type: '膜型血漿分離器', material: 'EVAL', indication: ['特定病因物質除去'], items: ['エバキュアープラス'],
    priming: { steps: ['生食洗浄'], vol_blood: '50mL', vol_wash: '1000mL' },
    treatment: { qb: '100 mL/min', notes: ['小孔径'] },
    finish: { method: '生食返血', vol: '-' }, insurance: '血漿分離器'
  },
  {
    id: 'cascadeflo-ec', name: 'カスケードフロー EC', maker: '旭化成', category: 'DFPP', type: '血漿成分分画器', material: 'EVAL', indication: ['ABO不適合', 'MG'], items: ['カスケードフロー本体'],
    priming: { steps: ['第2フィルタ洗浄'], vol_blood: '150mL', vol_wash: '2000mL' },
    treatment: { qb: '血漿20-30 mL/min', notes: ['間欠洗浄'] },
    finish: { method: '膜内回収', vol: '-' }, insurance: 'J045'
  },
  {
    id: 'cureflo-a', name: 'キュアフローA', maker: '旭化成', category: 'CRRT', type: '持続緩徐式血液濾過器', material: 'PS', indication: ['敗血症', 'AKI'], items: ['キュアフローA本体'],
    priming: { steps: ['洗浄'], vol_blood: '43-75mL', vol_wash: '1500mL' },
    treatment: { qb: '60-100 mL/min', notes: ['圧力損失低減'] },
    finish: { method: '返血', vol: '200mL' }, insurance: 'J038-2'
  },
  {
    id: 'vilife', name: 'ヴィライフ', maker: '旭化成', category: 'CRRT', type: '持続緩徐式血液濾過器', material: 'Vit.E固定化PS', indication: ['敗血症', 'AKI'], items: ['ヴィライフ本体'],
    priming: { steps: ['洗浄'], vol_blood: '45-75mL', vol_wash: '1500mL' },
    treatment: { qb: '50-150 mL/min', notes: ['抗酸化作用'] },
    finish: { method: '返血', vol: '-' }, insurance: 'J038-2'
  },
  {
    id: 'cart-ahf', name: 'AHF-MOW / AHF-UF', maker: '旭化成', category: 'CART', type: '腹水濾過・濃縮器', material: 'PS等', indication: ['難治性腹水'], items: ['AHF-MOW', 'AHF-UF'],
    priming: { steps: ['リークテスト'], vol_blood: '-', vol_wash: '1000mL' },
    treatment: { qb: '採取1000-2000 mL/h', notes: ['細菌除去', 'タンパク濃縮'] },
    finish: { method: 'エアー回収', vol: '-' }, insurance: 'K635'
  },
  {
    id: 'masscure', name: 'マスキュア', maker: 'カネカ', category: 'CART', type: '腹水濾過・濃縮フィルタ', material: 'PS/PES', indication: ['難治性腹水'], items: ['マスキュアフィルタ'],
    priming: { steps: ['リークテスト'], vol_blood: '-', vol_wash: '1000-2000mL' },
    treatment: { qb: '採取1000-2000 mL/h', notes: ['目詰まり抑制'] },
    finish: { method: 'エアー回収', vol: '-' }, insurance: 'K635'
  }
];

// --- Components ---

const Header = ({ reset, showBack, goBack }: { reset: () => void, showBack: boolean, goBack: () => void }) => (
  <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition" onClick={reset}>
        <Activity className="w-6 h-6 text-teal-400" />
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide">CE Assist <span className="text-teal-400">Pro</span></h1>
          <p className="text-[10px] text-gray-400">血液浄化業務支援・教育システム V18 Personal</p>
        </div>
      </div>
      {showBack && (
        <button onClick={goBack} className="flex items-center text-sm bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> 戻る
        </button>
      )}
    </div>
  </header>
);

const TileButton = ({ title, sub, icon, onClick, color = "blue", large = false }: any) => (
  <button 
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl border transition-all duration-300 group text-left flex flex-col justify-between
      ${large ? 'p-8 h-64' : 'p-6 h-full'}
      ${color === 'blue' ? 'bg-blue-50 border-blue-100 hover:border-blue-500 hover:shadow-blue-200/50' : ''}
      ${color === 'teal' ? 'bg-teal-50 border-teal-100 hover:border-teal-500 hover:shadow-teal-200/50' : ''}
      ${color === 'indigo' ? 'bg-indigo-50 border-indigo-100 hover:border-indigo-500 hover:shadow-indigo-200/50' : ''}
      ${color === 'rose' ? 'bg-rose-50 border-rose-100 hover:border-rose-500 hover:shadow-rose-200/50' : ''}
      ${color === 'slate' ? 'bg-slate-50 border-slate-200 hover:border-slate-500 hover:shadow-slate-200/50' : ''}
      hover:shadow-xl hover:-translate-y-1
    `}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-4 rounded-xl 
        ${color === 'blue' ? 'bg-blue-200 text-blue-700' : ''}
        ${color === 'teal' ? 'bg-teal-200 text-teal-700' : ''}
        ${color === 'indigo' ? 'bg-indigo-200 text-indigo-700' : ''}
        ${color === 'rose' ? 'bg-rose-200 text-rose-700' : ''}
        ${color === 'slate' ? 'bg-slate-200 text-slate-700' : ''}
      `}>
        {icon}
      </div>
    </div>
    <div>
      <h3 className={`${large ? 'text-3xl' : 'text-xl'} font-bold text-gray-800 mb-2`}>{title}</h3>
      <p className={`${large ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>{sub}</p>
    </div>
  </button>
);

// --- Updated Component: Plasma Simulation Modal (PE/SePE対応版) ---
const PlasmaSimulationModal = ({ onClose }: { onClose: () => void }) => {
  // 入力State
  const [weight, setWeight] = useState<string>('');
  const [hct, setHct] = useState<string>('');
  const [serumAlb, setSerumAlb] = useState<string>(''); 
  const [targetPv, setTargetPv] = useState<number>(1.0); 
  
  // モード選択: 'PE'(単純) or 'SePE'(選択的)
  const [peMode, setPeMode] = useState<'PE' | 'SePE'>('PE'); 
  // 置換液選択: 'Alb' or 'FFP'
  const [fluidType, setFluidType] = useState<'Alb' | 'FFP'>('Alb');

  // 計算結果State
  const [pv, setPv] = useState<number | null>(null);
  const [replacementVol, setReplacementVol] = useState<number | null>(null);
  const [targetAlbConc, setTargetAlbConc] = useState<number | null>(null); 
  const [albBottles, setAlbBottles] = useState<number | null>(null); 
  const [dilutionVol, setDilutionVol] = useState<number | null>(null); 
  const [ffpVolInfo, setFfpVolInfo] = useState<{ total: number, bag480: number, bag120: number } | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(hct);
    const alb = parseFloat(serumAlb);

    if (!isNaN(w) && !isNaN(h)) {
      // 1. PV算出 (日本標準式: W/13 * (1-Ht/100))
      const valPv = (w / 13) * (1 - h / 100);
      setPv(valPv);

      // 2. 置換液総量 (PV * 目標倍率)
      const valRep = valPv * targetPv; // 単位: L
      setReplacementVol(valRep);

      // 3. アルブミン置換の場合の計算
      if (fluidType === 'Alb' && !isNaN(alb)) {
        // PEなら100%, SePEなら75% を目標濃度とする
        const coefficient = peMode === 'SePE' ? 0.75 : 1.0;
        const targetConc = alb * coefficient;
        setTargetAlbConc(targetConc);

        // 必要アルブミン量(g) = 置換液総量(dL) * 目標濃度(g/dL)
        // valRepはLなので *10 でdL換算
        const reqAlbMass = (valRep * 10) * targetConc;
        
        // 必要本数 (25% 50mL製剤 = 1本あたり12.5g)
        const bottles = Math.ceil(reqAlbMass / 12.5);
        setAlbBottles(bottles);

        // 希釈液量
        const totalVolmL = valRep * 1000;
        const albVolmL = bottles * 50;
        setDilutionVol(totalVolmL - albVolmL);
        
        setFfpVolInfo(null);

      } else if (fluidType === 'FFP') {
        // 4. FFP置換の場合の計算
        const totalVolmL = valRep * 1000;
        
        // 480mL(5単位)バッグを優先して計算
        const bag480 = Math.floor(totalVolmL / 480);
        const remainder = totalVolmL % 480;
        // 残りを120mL(1単位)換算 (切り上げ)
        const bag120 = Math.ceil(remainder / 120);

        setFfpVolInfo({
            total: totalVolmL,
            bag480: bag480,
            bag120: bag120
        });
        
        setAlbBottles(null);
        setTargetAlbConc(null);
        setDilutionVol(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-rose-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Calculator className="w-6 h-6 mr-2" />
            血漿交換(PE/SePE) シミュレーション
          </h2>
          <button onClick={onClose} className="p-2 bg-rose-700 hover:bg-rose-800 rounded-full transition"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* 左カラム：入力・設定 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100 space-y-6">
                <h3 className="text-lg font-bold text-rose-800 flex items-center border-b pb-2">
                    <Settings className="w-5 h-5 mr-2" /> 治療条件設定
                </h3>

                {/* 1. モード選択 */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">治療モード (使用膜による選択)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => { setPeMode('PE'); setTargetPv(1.0); }}
                            className={`p-3 rounded-lg border-2 text-sm font-bold transition flex flex-col items-center justify-center ${peMode === 'PE' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            <span>PE (単純血漿交換)</span>
                            <span className="text-[10px] font-normal mt-1">標準膜 / Alb透過率≒100%</span>
                        </button>
                        <button 
                            onClick={() => { setPeMode('SePE'); setTargetPv(1.3); }}
                            className={`p-3 rounded-lg border-2 text-sm font-bold transition flex flex-col items-center justify-center ${peMode === 'SePE' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            <span>SePE (選択的)</span>
                            <span className="text-[10px] font-normal mt-1">準高分子膜 / Alb透過率≒75%</span>
                        </button>
                    </div>
                </div>

                {/* 2. 患者データ */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">体重 (kg)</label>
                        <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="60" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Ht (%)</label>
                        <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" value={hct} onChange={e=>setHct(e.target.value)} placeholder="30" />
                    </div>
                </div>

                {/* 3. アルブミン・置換液設定 */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">治療前 Alb値 (g/dL) <span className="text-red-500">*Alb置換時必須</span></label>
                    <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" value={serumAlb} onChange={e=>setSerumAlb(e.target.value)} placeholder="4.0" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">目標処理量 (PV倍率)</label>
                        <select 
                            value={targetPv} 
                            onChange={(e) => setTargetPv(parseFloat(e.target.value))}
                            className="w-full p-2 border rounded-lg bg-gray-50"
                        >
                            <option value={1.0}>1.0 PV (標準)</option>
                            <option value={1.2}>1.2 PV</option>
                            <option value={1.3}>1.3 PV (SePE推奨)</option>
                            <option value={1.5}>1.5 PV (上限目安)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">置換液の種類</label>
                        <div className="flex gap-1">
                            <button onClick={()=>setFluidType('Alb')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${fluidType==='Alb' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>Alb</button>
                            <button onClick={()=>setFluidType('FFP')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${fluidType==='FFP' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>FFP</button>
                        </div>
                    </div>
                </div>

                <button onClick={calculate} className="w-full bg-rose-600 text-white p-4 rounded-lg font-bold hover:bg-rose-700 transition shadow-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 mr-2" /> 計算実行
                </button>
            </div>

            {/* 右カラム：計算結果・ガイド */}
            <div className="space-y-6">
                {pv ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4 border-b pb-2">
                            <FileOutput className="w-5 h-5 mr-2" /> 計算結果
                        </h3>
                        
                        <div className="flex justify-around text-center mb-6">
                            <div>
                                <p className="text-xs text-gray-500 font-bold">循環血漿量 (PV)</p>
                                <p className="text-3xl font-extrabold text-gray-700">{pv.toFixed(2)} <span className="text-sm">L</span></p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold">必要置換液量 ({targetPv} PV)</p>
                                <p className="text-4xl font-extrabold text-rose-600">{replacementVol?.toFixed(2)} <span className="text-sm">L</span></p>
                            </div>
                        </div>

                        {/* Albumin 結果表示 */}
                        {fluidType === 'Alb' && albBottles !== null && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center mb-3">
                                    <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600"><FlaskConical className="w-5 h-5"/></div>
                                    <div>
                                        <p className="font-bold text-blue-900">Alb置換液 作成目安 ({peMode})</p>
                                        <p className="text-xs text-blue-700">目標濃度: <b>{targetAlbConc?.toFixed(2)} g/dL</b> ({peMode === 'SePE' ? '治療前の75%' : '治療前の100%'})</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm bg-white p-3 rounded border border-blue-100">
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-600">25%アルブミン (50mL/本)</span>
                                        <span className="font-bold text-xl text-blue-600">{albBottles} 本</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">希釈液 (乳酸リンゲル等)</span>
                                        <span className="font-bold text-xl text-gray-600">{dilutionVol?.toFixed(0)} mL</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FFP 結果表示 */}
                        {fluidType === 'FFP' && ffpVolInfo && (
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <div className="flex items-center mb-3">
                                    <div className="bg-orange-100 p-2 rounded-full mr-3 text-orange-600"><Syringe className="w-5 h-5"/></div>
                                    <div>
                                        <p className="font-bold text-orange-900">FFP 必要量 ({ffpVolInfo.total} mL)</p>
                                        <p className="text-xs text-orange-700">凝固因子補充・肝不全等</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm bg-white p-3 rounded border border-orange-100">
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-600">480規格 (5単位)</span>
                                        <span className="font-bold text-xl text-orange-600">{ffpVolInfo.bag480} 袋</span>
                                    </div>
                                    {ffpVolInfo.bag120 > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">120/240規格調整</span>
                                            <span className="font-bold text-lg text-gray-600">約 {ffpVolInfo.bag120} 単位分</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-right text-gray-400 mt-1">※供血者数を減らすため、可能な限り大容量製剤を使用</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-8">
                        <Activity className="w-12 h-12 mb-2 opacity-50"/>
                        <p>条件を入力して計算を実行してください</p>
                    </div>
                )}
            </div>
          </div>

          {/* 4. ガイド・知識ベース */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center"><Database className="w-4 h-4 mr-2"/>置換液の使い分け</h4>
                <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-start"><span className="font-bold text-blue-600 mr-1 min-w-[30px]">Alb:</span> <span>凝固因子の補充が<b>不要</b>な場合（自己免疫疾患など）。感染症・アレルギーリスクが低い。</span></li>
                    <li className="flex items-start"><span className="font-bold text-orange-600 mr-1 min-w-[30px]">FFP:</span> <span>凝固因子の補充が<b>必要</b>な場合（TTP, 肝不全, 出血傾向）。副作用リスク（アレルギー, TRALI, 感染症）に注意。</span></li>
                </ul>
            </div>
            
            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center"><Layers className="w-4 h-4 mr-2"/>PE と SePE の違い</h4>
                <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-300 font-bold text-slate-500">
                        <tr><th className="pb-1">項目</th><th className="pb-1">PE (単純)</th><th className="pb-1">SePE (選択的)</th></tr>
                    </thead>
                    <tbody className="text-slate-600 divide-y divide-slate-200">
                        <tr><td className="py-1 font-bold">膜孔径</td><td>標準</td><td>小さい (EC-4A等)</td></tr>
                        <tr><td className="py-1 font-bold">Alb透過</td><td>≒ 1.0 (全捨て)</td><td>≒ 0.75 (一部回収)</td></tr>
                        <tr><td className="py-1 font-bold">置換濃度</td><td>100% (等量)</td><td>75% (節約可)</td></tr>
                        <tr><td className="py-1 font-bold">適応</td><td>劇症肝炎など</td><td>自己免疫疾患など</td></tr>
                    </tbody>
                </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const CartGuideModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-teal-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Droplet className="w-6 h-6 mr-2" />
            CART (腹水濾過濃縮再静注法) ガイド
          </h2>
          <button onClick={onClose} className="p-2 bg-teal-700 hover:bg-teal-800 rounded-full transition"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-grow">
          <div className="space-y-6 text-sm text-gray-700">
            {/* Overview */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-800 mb-2">1. CARTの概要</h3>
              <p>がんや肝硬変で溜まった腹水（または胸水）を採取し、濾過器で細菌やがん細胞を除去した後、濃縮器でアルブミンなどの有用なタンパク成分を濃縮して患者に戻す治療法です。</p>
            </div>

            {/* Checklist */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">2. 必須確認項目 (アフェレシス学会指針)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-2 flex-shrink-0"/>
                  <div><span className="font-bold">患者情報:</span> 感染症(HBV/HCV等)の有無</div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-2 flex-shrink-0"/>
                  <div><span className="font-bold">原腹水性状:</span> 血性、析出物、TP濃度</div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-2 flex-shrink-0"/>
                  <div><span className="font-bold">禁忌:</span> 腹水エンドトキシン陽性、免疫不全</div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-2 flex-shrink-0"/>
                  <div><span className="font-bold">管理:</span> 採取日の記載、ラベル貼付</div>
                </div>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">3. 推奨管理基準</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
                    <tr><th className="p-3">工程</th><th className="p-3">推奨値</th><th className="p-3">理由・備考</th></tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    <tr><td className="p-3 font-bold">腹水採取速度</td><td className="p-3">1,000 - 2,000 mL/h</td><td className="p-3 text-gray-500">血圧低下防止</td></tr>
                    <tr><td className="p-3 font-bold">処理速度</td><td className="p-3">MAX 3,000 mL/h</td><td className="p-3 text-gray-500">効率的濾過のため</td></tr>
                    <tr><td className="p-3 font-bold">目標蛋白濃度</td><td className="p-3">15 g/dL 前後</td><td className="p-3 text-gray-500">生理的濃度へ調整</td></tr>
                    <tr><td className="p-3 font-bold">TMP (膜圧)</td><td className="p-3 text-rose-600 font-bold">300 mmHg以内</td><td className="p-3 text-gray-500">400超で目詰まり疑い</td></tr>
                    <tr><td className="p-3 font-bold">血性腹水TMP</td><td className="p-3 text-rose-600 font-bold">100 mmHg以下</td><td className="p-3 text-gray-500">溶血防止 (重要)</td></tr>
                    <tr><td className="p-3 font-bold">再静注速度</td><td className="p-3">100 - 150 mL/h</td><td className="p-3 text-gray-500">発熱・ショック回避</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leak Test & Metaphor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-2">リークテスト (必須)</h3>
                <p className="text-xs mb-2 text-gray-600">濾過膜の破綻を確認する安全点検。</p>
                <ul className="list-disc ml-4 text-xs">
                  <li><b>手動法:</b> 400mmHg加圧し、2分で20mmHg以内の降下なら合格。</li>
                  <li><b>落差法:</b> 排液ラインを80cm下げて確認。</li>
                </ul>
              </div>
              <div className="bg-teal-50 p-5 rounded-xl border-l-4 border-teal-400">
                <h3 className="font-bold text-teal-800 mb-2 flex items-center"><BookOpen className="w-4 h-4 mr-2"/> 例え話: 汚れたプール</h3>
                <p className="text-xs text-teal-900 leading-relaxed">
                  CARTは「汚れたプールの水を特殊フィルターに通して、必要なミネラル分だけの濃縮エキスを作る作業」です。<br/>
                  <br/>
                  <b>血性腹水のTMP制限:</b> デリケートな赤血球（卵のように脆い）が、圧力でフィルターに押し付けられて割れないよう、「優しく濾す」ルールです。<br/>
                  <b>再静注速度:</b> 濃いエキスを戻す際、急に入れると水質（体調）が急変して魚（患者）がびっくりするので、「点滴のように一滴ずつ」戻します。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReimbursementModal = ({ type, onClose }: { type: ApheresisType | 'COLUMN', onClose: () => void }) => {
  const data = REIMBURSEMENT_INFO[type as keyof typeof REIMBURSEMENT_INFO];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-emerald-700 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2" />
            診療報酬・算定要件
          </h2>
          <button onClick={onClose} className="p-2 bg-emerald-800 hover:bg-emerald-900 rounded-full transition"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-emerald-800 mb-2">{data.title}</h3>
          <div className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">{data.points}</div>
            
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-700 mb-3">特定保険医療材料 (材料価格)</h4>
              <ul className="space-y-2 text-sm">
                {data.material.map((m: any, i: number) => (
                  <li key={i}>
                    {m.name}: <span className="font-bold text-lg text-emerald-700">{m.price ? m.price : ''}</span>
                    {m.list && (
                      <div className="text-xs text-gray-500 mt-1 ml-2">
                        例: {m.list.join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-3">留意事項・加算</h4>
              <ul className="list-disc ml-5 space-y-2 text-sm text-emerald-900">
                {data.notes.map((note: string, i: number) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Updated Components Implementation ---

const DialyzerDetail = ({ series }: { series: DialyzerSeries }) => {
  const [size, setSize] = useState<number>(Object.keys(series.specs).map(Number).sort()[0]);
  const spec = series.specs[size];

  return (
    <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center -m-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className={`text-xs font-bold px-2 py-1 rounded text-white ${series.type === 'hemodiafilter' ? 'bg-teal-600' : 'bg-blue-600'}`}>
              {series.type === 'hemodiafilter' ? 'HDF' : 'HD'}
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700">{series.maker}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{series.name}</h2>
        </div>
        <div className="text-center flex flex-col gap-2">
          {series.jsdtClass && (
             <div className="px-3 py-1 rounded-full bg-slate-800 text-white font-bold shadow-lg text-lg">
               {series.jsdtClass}型
             </div>
          )}
          {series.hdfClass && (
             <div className="px-3 py-1 rounded-full bg-teal-600 text-white font-bold shadow-lg text-sm">
               {series.hdfClass}
             </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-3">膜面積 (Surface Area)</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(series.specs).map(Number).sort((a,b)=>a-b).map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-sm ${size === s ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s < 10 ? s.toFixed(1) + ' ㎡' : `Size ${s}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
           <h3 className="font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><Activity className="w-5 h-5 mr-2 text-blue-500"/> スペック詳細</h3>
           <table className="w-full text-sm">
             <tbody>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">膜素材</td><td className="py-3 font-medium text-right">{series.material}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">PVP (親水化剤)</td><td className="py-3 font-medium text-right">{series.pvp === '○' ? '含有あり' : 'なし'}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">BPA (溶出)</td><td className="py-3 font-medium text-right">{series.bpa === '○' ? 'あり' : 'なし'}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">滅菌方法</td><td className="py-3 font-medium text-right">{series.sterilization}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">UFR (mL/hr/mmHg)</td><td className="py-3 font-bold text-right text-lg">{spec.ufr}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">プライミング量 (mL)</td><td className="py-3 font-medium text-right">{spec.vol}</td></tr>
               <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Urea</td><td className="py-3 font-medium text-right">{spec.clearance.ure}</td></tr>
               {spec.clearance.phos && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Phos</td><td className="py-3 font-medium text-right">{spec.clearance.phos}</td></tr>}
               {spec.clearance.b2mg && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance β2-MG</td><td className="py-3 font-medium text-right">{spec.clearance.b2mg}</td></tr>}
               {spec.clearance.b12 && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Vit.B12</td><td className="py-3 font-medium text-right">{spec.clearance.b12}</td></tr>}
             </tbody>
           </table>
           <p className="text-xs text-gray-400 mt-2 text-right">※数値は代表値またはシミュレーション値です</p>
        </div>
          
        <div className="space-y-6">
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center"><Info className="w-4 h-4 mr-2"/> 特徴</h3>
            <ul className="space-y-2">
              {series.features.map((f,i) => (
                <li key={i} className="flex items-start text-sm text-blue-900">
                  <CheckCircle className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5"/> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApheresisModal = ({ device, onClose }: { device: ApheresisDevice, onClose: () => void }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-rose-700 text-white p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center"><ShieldAlert className="w-6 h-6 mr-2" />{device.name}</h2>
                <button onClick={onClose} className="p-2 bg-rose-800 hover:bg-rose-900 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">基本情報</h3>
                        <p className="text-sm mb-2"><span className="font-bold">メーカー:</span> {device.maker}</p>
                        <p className="text-sm mb-2"><span className="font-bold">適応疾患:</span> {device.indication.join(", ")}</p>
                        <p className="text-sm mb-2"><span className="font-bold">構成品:</span> {device.items.join(", ")}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">治療条件目安</h3>
                        <p className="text-sm mb-2"><span className="font-bold">血流量 (QB):</span> {device.treatment.qb}</p>
                        {device.treatment.time && <p className="text-sm mb-2"><span className="font-bold">時間:</span> {device.treatment.time}</p>}
                        <ul className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                            {device.treatment.notes.map((n, i) => <li key={i}>・{n}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ComparisonTool = ({ db }: { db: DialyzerSeries[] }) => {
  const [sourceMaker, setSourceMaker] = useState('');
  const [sourceSeries, setSourceSeries] = useState<DialyzerSeries | null>(null);
  const [sourceSize, setSourceSize] = useState<string>('');

  const [targetMaker, setTargetMaker] = useState('');
  const [targetSeries, setTargetSeries] = useState<DialyzerSeries | null>(null);
  const [targetSize, setTargetSize] = useState<string>('');

  const makers = Array.from(new Set(db.map(d => d.maker)));

  const handleSourceSeriesChange = (seriesId: string) => {
    const s = db.find(d => d.id === seriesId) || null;
    setSourceSeries(s);
    if(s) {
      const sizes = Object.keys(s.specs);
      const def = sizes.find(sz => sz === '1.5') || sizes[0];
      setSourceSize(def);
    } else {
      setSourceSize('');
    }
  };

  const handleTargetSeriesChange = (seriesId: string) => {
    const s = db.find(d => d.id === seriesId) || null;
    setTargetSeries(s);
    if(s) {
      const sizes = Object.keys(s.specs);
      const def = sizes.find(sz => sz === '1.5') || sizes[0];
      setTargetSize(def);
    } else {
      setTargetSize('');
    }
  };

  const renderSpecRow = (label: string, val1: any, val2: any, unit: string = '') => (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition">
      <td className="py-3 px-2 text-xs font-bold text-gray-500 w-1/3">{label}</td>
      <td className={`py-3 px-2 text-sm text-center w-1/3 font-medium ${val1 && val2 && val1 > val2 ? 'text-blue-600' : ''}`}>{val1 ?? '-'} <span className="text-[10px] text-gray-400">{unit}</span></td>
      <td className={`py-3 px-2 text-sm text-center w-1/3 font-medium ${val2 && val1 && val2 > val1 ? 'text-rose-600' : ''}`}>{val2 ?? '-'} <span className="text-[10px] text-gray-400">{unit}</span></td>
    </tr>
  );

  const getSpec = (series: DialyzerSeries | null, sizeStr: string) => {
    if(!series || !sizeStr) return null;
    const sz = parseFloat(sizeStr);
    return series.specs[sz];
  };

  const sSpec = getSpec(sourceSeries, sourceSize);
  const tSpec = getSpec(targetSeries, targetSize);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
      <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
        <ArrowRightLeft className="w-5 h-5 mr-2 text-indigo-600" />
        製品スペック比較 (シミュレーション)
      </h3>

      {/* Selectors Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Source Side */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="text-xs font-bold text-blue-800 mb-2 text-center bg-blue-200 rounded py-1">現状 (Current)</div>
          <select className="w-full mb-2 p-1 text-xs border rounded" value={sourceMaker} onChange={e=>setSourceMaker(e.target.value)}>
            <option value="">メーカー選択</option>
            {makers.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select className="w-full mb-2 p-1 text-xs border rounded" disabled={!sourceMaker} onChange={e=>handleSourceSeriesChange(e.target.value)}>
            <option value="">製品選択</option>
            {db.filter(d=>d.maker===sourceMaker).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {sourceSeries && (
            <select className="w-full p-1 text-xs border rounded font-bold text-blue-900" value={sourceSize} onChange={e=>setSourceSize(e.target.value)}>
              {Object.keys(sourceSeries.specs).map(sz => <option key={sz} value={sz}>{sz} ㎡/type</option>)}
            </select>
          )}
        </div>

        {/* Target Side */}
        <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
          <div className="text-xs font-bold text-rose-800 mb-2 text-center bg-rose-200 rounded py-1">検討 (Target)</div>
          <select className="w-full mb-2 p-1 text-xs border rounded" value={targetMaker} onChange={e=>setTargetMaker(e.target.value)}>
            <option value="">メーカー選択</option>
            {makers.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select className="w-full mb-2 p-1 text-xs border rounded" disabled={!targetMaker} onChange={e=>handleTargetSeriesChange(e.target.value)}>
            <option value="">製品選択</option>
            {db.filter(d=>d.maker===targetMaker).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {targetSeries && (
            <select className="w-full p-1 text-xs border rounded font-bold text-rose-900" value={targetSize} onChange={e=>setTargetSize(e.target.value)}>
              {Object.keys(targetSeries.specs).map(sz => <option key={sz} value={sz}>{sz} ㎡/type</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-y-auto flex-grow border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="py-2 px-2 text-xs text-left text-gray-500 font-normal">項目</th>
              <th className="py-2 px-2 text-xs text-center font-bold text-blue-800 bg-blue-50 w-1/3 truncate">{sourceSeries?.name || '-'}</th>
              <th className="py-2 px-2 text-xs text-center font-bold text-rose-800 bg-rose-50 w-1/3 truncate">{targetSeries?.name || '-'}</th>
            </tr>
          </thead>
          <tbody>
            {renderSpecRow('分類', sourceSeries?.type === 'hemodiafilter' ? 'HDF' : 'HD', targetSeries?.type === 'hemodiafilter' ? 'HDF' : 'HD')}
            {renderSpecRow('膜素材', sourceSeries?.material, targetSeries?.material)}
            {renderSpecRow('機能分類', sourceSeries?.jsdtClass || sourceSeries?.hdfClass, targetSeries?.jsdtClass || targetSeries?.hdfClass)}
            {renderSpecRow('膜面積', sourceSize, targetSize, '㎡')}
            {renderSpecRow('UFR', sSpec?.ufr, tSpec?.ufr, 'mL/hr/mmHg')}
            {renderSpecRow('プライミング', sSpec?.vol, tSpec?.vol, 'mL')}
            <tr className="bg-slate-50"><td colSpan={3} className="py-1 px-2 text-[10px] font-bold text-gray-400 text-center">クリアランス (QB=200, QD=500)</td></tr>
            {renderSpecRow('尿素 (Urea)', sSpec?.clearance.ure, tSpec?.clearance.ure, 'mL/min')}
            {renderSpecRow('リン (Phos)', sSpec?.clearance.phos, tSpec?.clearance.phos, 'mL/min')}
            {renderSpecRow('β2-MG', sSpec?.clearance.b2mg, tSpec?.clearance.b2mg, 'mL/min')}
            {renderSpecRow('Vit.B12', sSpec?.clearance.b12, tSpec?.clearance.b12, 'mL/min')}
          </tbody>
        </table>
      </div>
      {(sSpec || tSpec) && (
        <div className="mt-3 text-[10px] text-gray-400 text-right">
          ※数値はカタログ代表値またはシミュレーション値です。<br/>
          ※実際の生体性能は条件により異なります。
        </div>
      )}
    </div>
  );
};


// --- Main App ---

export default function CEAssistPro_V18() {
  const [view, setView] = useState<ViewMode>('top_menu');
   
  // Integrated Search Filters (Home Page)
  const [makerFilter, setMakerFilter] = useState<string>('');
  const [jsdtFilter, setJsdtFilter] = useState<JSDTClass | ''>('');
  const [materialFilter, setMaterialFilter] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Drill-down View State
  const [selectedApheType, setSelectedApheType] = useState<ApheresisType | 'COLUMN' | null>(null);
  const [showReimbursement, setShowReimbursement] = useState<boolean>(false);
  const [showPlasmaSim, setShowPlasmaSim] = useState<boolean>(false); 
  const [showCartGuide, setShowCartGuide] = useState<boolean>(false);
  const [apheDiseaseFilter, setApheDiseaseFilter] = useState<string>('');

  const [selectedSeries, setSelectedSeries] = useState<DialyzerSeries | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ApheresisDevice | null>(null);

  // Treatment View specific sub-filters
  const [treatmentSubFilter, setTreatmentSubFilter] = useState<ProductType | null>(null);
  const [hdfSubFilter, setHdfSubFilter] = useState<HDFClass | null>(null);

  const reset = () => {
    setView('top_menu'); 
    setMakerFilter('');
    setJsdtFilter('');
    setMaterialFilter('');
    setIsSearchActive(false);
    setSelectedSeries(null);
    setSelectedDevice(null);
    setSelectedApheType(null);
    setShowReimbursement(false);
    setShowPlasmaSim(false);
    setShowCartGuide(false);
    setApheDiseaseFilter('');
    setTreatmentSubFilter(null);
    setHdfSubFilter(null);
  };

  const goBack = () => {
    if(selectedSeries) { setSelectedSeries(null); return; }
    if(selectedDevice) { setSelectedDevice(null); return; }
    
    if(view === 'apheresis_list' || view === 'column_list' || view === 'apheresis_disease') { 
      setView('apheresis_menu'); 
      setSelectedApheType(null); 
      setApheDiseaseFilter('');
      return; 
    }
    
    if (view === 'treatment' && treatmentSubFilter) {
      setTreatmentSubFilter(null);
      setHdfSubFilter(null);
      return; 
    }
    if (view === 'manufacturer' && makerFilter) {
      setMakerFilter('');
      return;
    }
    if (view === 'classification' && jsdtFilter) {
      setJsdtFilter('');
      return;
    }
    if(view === 'manufacturer' || view === 'classification' || view === 'treatment') {
      setView('hemodialysis_menu');
      return;
    }

    if(view === 'hemodialysis_menu' || view === 'apheresis_menu') {
      setView('top_menu');
      return;
    }

    reset();
  };

  const switchToView = (newView: ViewMode) => {
    setView(newView);
  };

  const handleApheSelect = (type: ApheresisType) => {
    setSelectedApheType(type);
    setView('apheresis_list');
  };

  const executeSearch = () => {
    setIsSearchActive(true);
  };

  const clearSearch = () => {
    setMakerFilter('');
    setJsdtFilter('');
    setMaterialFilter('');
    setIsSearchActive(false);
  };

  const homeSearchResults = useMemo(() => {
    if (!isSearchActive || view !== 'hemodialysis_menu') return [];
    let list = DIALYZER_DB;
    if(makerFilter) list = list.filter(d => d.maker.includes(makerFilter));
    if(jsdtFilter) list = list.filter(d => d.jsdtClass === jsdtFilter);
    if(materialFilter) list = list.filter(d => d.material.includes(materialFilter));
    return list;
  }, [makerFilter, jsdtFilter, materialFilter, isSearchActive, view]);

  const manufacturerList = useMemo(() => {
    if (view !== 'manufacturer' || !makerFilter) return [];
    return DIALYZER_DB.filter(d => d.maker === makerFilter);
  }, [view, makerFilter]);

  const classificationList = useMemo(() => {
    if (view !== 'classification' || !jsdtFilter) return [];
    return DIALYZER_DB.filter(d => d.jsdtClass === jsdtFilter);
  }, [view, jsdtFilter]);

  const treatmentList = useMemo(() => {
    if (view !== 'treatment') return [];
    let list = DIALYZER_DB;
    if (treatmentSubFilter) list = list.filter(d => d.type === treatmentSubFilter);
    if (hdfSubFilter) list = list.filter(d => d.hdfClass === hdfSubFilter);
    if (!treatmentSubFilter) return [];
    return list;
  }, [view, treatmentSubFilter, hdfSubFilter]);

  const filteredDiseaseDevices = useMemo(() => {
    if (!apheDiseaseFilter) return [];
    return APHERESIS_DEVICES.filter(d => 
      d.indication.some(ind => ind.includes(apheDiseaseFilter))
    );
  }, [apheDiseaseFilter]);

  const filteredApheList = useMemo(() => {
    if (!selectedApheType) return [];
    return APHERESIS_DEVICES.filter(d => d.category === selectedApheType);
  }, [selectedApheType]);

  const filteredColumnList = useMemo(() => {
    return APHERESIS_DEVICES.filter(d => d.category === 'COLUMN');
  }, []);

  const makers = Array.from(new Set(DIALYZER_DB.map(d => d.maker)));
  const materials = Array.from(new Set(DIALYZER_DB.map(d => d.material.split('(')[0].trim())));
  const allDiseases = Array.from(new Set(APHERESIS_DEVICES.flatMap(d => d.indication)));

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 pb-12">
      <CustomStyles />
      <Header reset={reset} showBack={view !== 'top_menu'} goBack={goBack} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {view === 'top_menu' && (
          <div className="animate-fade-in flex flex-col items-center justify-center h-[80vh] space-y-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-extrabold text-slate-800 mb-2">CE Assist Pro</h2>
              <p className="text-xl text-slate-500 font-medium">
                <User className="inline w-5 h-5 mb-1 mr-1"/>
                あなただけの、オリジナル臨床工学支援アプリケーション
              </p>
              <p className="text-sm text-slate-400 mt-2">
                資料を保存し、知識を体系化して、日々の業務をサポートします。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
              <TileButton 
                large={true}
                title="血液浄化療法" 
                sub="Hemodialysis / HDF" 
                icon={<Droplet size={48}/>} 
                color="blue" 
                onClick={() => setView('hemodialysis_menu')} 
              />
              <TileButton 
                large={true}
                title="アフェレーシス療法" 
                sub="Apheresis / PE / CRRT / CART" 
                icon={<ShieldAlert size={48}/>} 
                color="rose" 
                onClick={() => setView('apheresis_menu')} 
              />
            </div>
          </div>
        )}

        {view === 'hemodialysis_menu' && !selectedSeries && (
          <div className="animate-fade-in space-y-8">
            <div className="flex items-center mb-2">
              <h2 className="text-2xl font-bold text-blue-900 flex items-center">
                <Droplet className="w-8 h-8 mr-2"/>
                血液浄化療法メニュー
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:h-[200px]">
               <TileButton 
                 title="メーカー検索" 
                 sub="メーカー別一覧表示" 
                 icon={<Search size={32}/>} 
                 color="blue" onClick={() => switchToView('manufacturer')} 
               />
               <TileButton 
                 title="JSDT機能分類" 
                 sub="Ⅰa, Ⅰb, Ⅱa, Ⅱb, S" 
                 icon={<Activity size={32}/>} 
                 color="teal" onClick={() => switchToView('classification')} 
               />
               <TileButton 
                 title="治療法・膜素材" 
                 sub="HD, HDF, 膜素材別" 
                 icon={<Droplet size={32}/>} 
                 color="indigo" onClick={() => switchToView('treatment')} 
               />
               <TileButton 
                 title="β2-MGカラム" 
                 sub="リクセル・フィルトール" 
                 icon={<Layers size={32}/>} 
                 color="slate" onClick={() => { setView('column_list'); setSelectedApheType('COLUMN'); }}
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    ダイアライザ統合検索
                  </div>
                  {isSearchActive && (
                    <button onClick={clearSearch} className="text-xs text-red-500 flex items-center hover:underline">
                      <RefreshCw className="w-3 h-3 mr-1"/> リセット
                    </button>
                  )}
                </h3>
                  
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">メーカー</label>
                    <select className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" value={makerFilter} onChange={(e) => setMakerFilter(e.target.value)}>
                      <option value="">指定なし</option>
                      {makers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">機能分類</label>
                      <select className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" value={jsdtFilter} onChange={(e) => setJsdtFilter(e.target.value as any)}>
                        <option value="">指定なし</option>
                        {['Ⅰa', 'Ⅰb', 'Ⅱa', 'Ⅱb', 'S', '特定積層型'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">膜素材</label>
                      <select className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)}>
                        <option value="">指定なし</option>
                        {materials.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={executeSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg transition shadow-md flex items-center justify-center mt-2">
                    <Search className="w-4 h-4 mr-2" /> 検索開始
                  </button>
                </div>

                {isSearchActive && (
                  <div className="animate-fade-in border-t pt-4 overflow-y-auto flex-grow h-64">
                    <div className="grid grid-cols-1 gap-2">
                      {homeSearchResults.length > 0 ? (
                        homeSearchResults.map(d => (
                          <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[10px] text-gray-500">{d.maker}</div>
                                <h3 className="font-bold text-sm text-gray-800 group-hover:text-blue-600">{d.name}</h3>
                              </div>
                              <ChevronRight className="text-gray-300 w-4 h-4 group-hover:text-blue-500"/>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">該当する製品が見つかりません</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ComparisonTool db={DIALYZER_DB} />
            </div>
          </div>
        )}

        {view === 'manufacturer' && !selectedSeries && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">メーカー別検索</h2>
            {!makerFilter ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {makers.map(m => (
                  <button key={m} onClick={() => setMakerFilter(m)} className="bg-white p-6 rounded-xl shadow hover:shadow-lg font-bold text-lg border-l-4 border-blue-500 text-left">{m}</button>
                ))}
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center mb-4"><h3 className="font-bold text-xl text-blue-800 bg-blue-100 px-4 py-2 rounded-lg">{makerFilter} 製品一覧</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manufacturerList.map(d => (
                    <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div><h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3><div className="flex flex-wrap gap-2 mt-2"><span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span>{d.jsdtClass && <span className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded">{d.jsdtClass}</span>}</div></div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'classification' && !selectedSeries && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">JSDT機能分類別検索</h2>
            {!jsdtFilter ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {['Ⅰa', 'Ⅰb', 'Ⅱa', 'Ⅱb', 'S', '特定積層型'].map(c => (
                  <button key={c} onClick={() => setJsdtFilter(c as JSDTClass)} className="bg-white p-6 rounded-xl shadow hover:shadow-lg font-bold text-lg border-l-4 border-teal-500 text-center">{c}</button>
                ))}
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center mb-4"><h3 className="font-bold text-xl text-teal-800 bg-teal-100 px-4 py-2 rounded-lg">{jsdtFilter}型 製品一覧</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classificationList.map(d => (
                    <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div><div className="text-xs text-gray-500 mb-1">{d.maker}</div><h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3><div className="flex flex-wrap gap-2 mt-2"><span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span><span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">{d.material}</span></div></div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'treatment' && !selectedSeries && (
           <div className="animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800 mb-6">治療法・膜素材から探す</h2>
             {!treatmentSubFilter ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <button onClick={() => setTreatmentSubFilter('dialyzer')} className="bg-white border-2 border-blue-500 p-8 rounded-xl shadow-lg hover:bg-blue-50 transition text-left group"><h3 className="text-2xl font-bold text-blue-800 mb-2 group-hover:text-blue-600">HD (血液透析)</h3><p className="text-gray-600">拡散主体。小分子除去効率を重視。</p></button>
                 <button onClick={() => setTreatmentSubFilter('hemodiafilter')} className="bg-white border-2 border-teal-500 p-8 rounded-xl shadow-lg hover:bg-teal-50 transition text-left group"><h3 className="text-2xl font-bold text-teal-800 mb-2 group-hover:text-teal-600">HDF (血液透析濾過)</h3><p className="text-gray-600">濾過主体。アルブミン漏出特性から選択。</p></button>
               </div>
             ) : (
               <div className="animate-fade-in">
                 {treatmentSubFilter === 'hemodiafilter' && (
                   <div className="mb-6"><h3 className="font-bold text-md text-gray-600 mb-2">アルブミン漏出特性で絞り込み:</h3><div className="flex flex-wrap gap-2"><button onClick={() => setHdfSubFilter(null)} className={`px-4 py-2 rounded-full font-bold transition ${!hdfSubFilter ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>すべて</button>{['Alb低漏出', 'Alb中漏出', 'Alb高漏出'].map(c => (<button key={c} onClick={() => setHdfSubFilter(c as HDFClass)} className={`px-4 py-2 rounded-full font-bold transition ${hdfSubFilter === c ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800 hover:bg-teal-200'}`}>{c}</button>))}</div></div>
                 )}
                 <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-xl text-gray-800">{treatmentSubFilter === 'dialyzer' ? 'HD (血液透析) 製品一覧' : 'HDF (血液透析濾過) 製品一覧'}</h3></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {treatmentList.map(d => (
                     <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                       <div className="flex justify-between items-start">
                         <div><div className="text-xs text-gray-500 mb-1">{d.maker}</div><h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3><div className="flex flex-wrap gap-2 mt-2"><span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span>{d.hdfClass && <span className="text-[10px] bg-teal-700 text-white px-2 py-1 rounded">{d.hdfClass}</span>}<span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">{d.material}</span></div></div>
                         <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
        )}

        {selectedSeries && <DialyzerDetail series={selectedSeries} />}

        {view === 'column_list' && !selectedDevice && (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-indigo-900 flex items-center">
                <Layers className="w-8 h-8 mr-2" />
                β2-MG 吸着カラム
              </h2>
              <button onClick={() => setShowReimbursement(true)} className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow transition"><FileSpreadsheet className="w-5 h-5 mr-2" />診療報酬・算定要件</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredColumnList.map(device => (
                <button key={device.id} onClick={() => setSelectedDevice(device)} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all text-left flex flex-col h-full group">
                  <div className="mb-4 flex justify-between items-start"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">{device.category}</span><span className="text-[10px] text-gray-400 border px-1 rounded">{device.maker}</span></div>
                  <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{device.name}</h3>
                  <div className="flex-grow"><ul className="text-xs text-gray-500 list-disc ml-4 space-y-1">{device.indication.slice(0, 3).map((ind, i) => <li key={i}>{ind}</li>)}</ul></div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-indigo-500 font-bold text-sm">マニュアルを確認 <ChevronRight className="w-4 h-4 ml-1" /></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'apheresis_menu' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center">
              <ShieldAlert className="w-8 h-8 mr-2" />
              アフェレーシス療法選択
            </h2>
              
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button 
                onClick={() => setView('apheresis_disease')}
                className="bg-white p-4 rounded-xl shadow border border-rose-100 flex items-center justify-center font-bold text-sm text-rose-600 hover:bg-rose-50 transition"
              >
                <Stethoscope className="w-5 h-5 mr-2" />
                適応疾患から検索
              </button>
              <button 
                onClick={() => setShowPlasmaSim(true)}
                className="bg-white p-4 rounded-xl shadow border border-rose-100 flex items-center justify-center font-bold text-sm text-rose-600 hover:bg-rose-50 transition"
              >
                <Calculator className="w-5 h-5 mr-2" />
                血漿交換シミュレーション
              </button>
              <button 
                onClick={() => setShowCartGuide(true)}
                className="bg-white p-4 rounded-xl shadow border border-teal-100 flex items-center justify-center font-bold text-sm text-teal-600 hover:bg-teal-50 transition"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                CART 実施・解析ガイド
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { type: 'CRRT', label: 'CRRT (持続緩徐式血液濾過)', desc: 'AKI, 敗血症, 重症膵炎など' },
                { type: 'PE', label: 'PE (単純血漿交換)', desc: '劇症肝炎, 術後肝不全, TTPなど' },
                { type: 'DFPP', label: 'DFPP (二重濾過血漿交換)', desc: 'ABO不適合, MG, SLEなど' },
                { type: 'PA', label: 'PA (血漿吸着)', desc: '免疫吸着, ビリルビン吸着' },
                { type: 'DHP', label: 'DHP (血液吸着)', desc: '薬物中毒, 肝性昏睡, UC, 敗血症' },
                { type: 'CART', label: 'CART (腹水濾過濃縮)', desc: '難治性腹水・胸水' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleApheSelect(item.type as ApheresisType)}
                  className="bg-white p-6 rounded-2xl border-2 border-rose-100 hover:border-rose-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold text-gray-800 group-hover:text-rose-700">{item.type}</span>
                    <ChevronRight className="text-gray-300 group-hover:text-rose-500" />
                  </div>
                  <div className="font-bold text-sm text-gray-700 mb-1">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'apheresis_list' && selectedApheType && !selectedDevice && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-rose-800 flex items-center">
                <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded text-lg mr-3">{selectedApheType}</span>
                デバイス一覧
              </h2>
              {(selectedApheType === 'CRRT' || selectedApheType === 'PE' || selectedApheType === 'DFPP' || selectedApheType === 'PA' || selectedApheType === 'DHP' || selectedApheType === 'CART') && (
                <button 
                  onClick={() => setShowReimbursement(true)}
                  className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow transition"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  診療報酬・算定要件
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApheList.map(device => (
                <div 
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className="bg-white p-5 rounded-xl border border-gray-200 hover:border-rose-500 cursor-pointer shadow-sm hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{device.maker}</div>
                      <h3 className="font-bold text-lg text-gray-800 group-hover:text-rose-600">{device.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-1 rounded text-white bg-rose-500">{device.type}</span>
                        {device.indication.slice(0, 2).map((ind, i) => (
                           <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded truncate max-w-[150px]">{ind}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-rose-500"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'apheresis_disease' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center">
              <Stethoscope className="w-8 h-8 mr-2" />
              適応疾患から検索
            </h2>
              
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
              <h3 className="text-sm font-bold text-gray-500 mb-3">疾患を選択してください</h3>
              <div className="flex flex-wrap gap-2">
                {allDiseases.map(disease => (
                  <button
                    key={disease}
                    onClick={() => setApheDiseaseFilter(disease === apheDiseaseFilter ? '' : disease)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                      apheDiseaseFilter === disease 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {disease}
                  </button>
                ))}
              </div>
            </div>

            {apheDiseaseFilter && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {filteredDiseaseDevices.map(device => (
                  <div 
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className="bg-white p-5 rounded-xl border border-gray-200 hover:border-rose-500 cursor-pointer shadow-sm hover:shadow-md transition group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{device.maker}</div>
                        <h3 className="font-bold text-lg text-gray-800 group-hover:text-rose-600">{device.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[10px] px-2 py-1 rounded text-white bg-rose-500">{device.category}</span>
                          {device.indication.map((ind, i) => (
                            <span key={i} className={`text-[10px] px-2 py-1 rounded truncate max-w-[150px] ${ind.includes(apheDiseaseFilter) ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-rose-500"/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDevice && (
          <ApheresisModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        )}

        {showReimbursement && selectedApheType && (
          <ReimbursementModal type={selectedApheType} onClose={() => setShowReimbursement(false)} />
        )}

        {showPlasmaSim && (
          <PlasmaSimulationModal onClose={() => setShowPlasmaSim(false)} />
        )}

        {showCartGuide && (
          <CartGuideModal onClose={() => setShowCartGuide(false)} />
        )}

      </main>
    </div>
  );
}
