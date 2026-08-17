import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';

const AGREEMENT_FEE = 10000;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const TOP_Y = 800;
const BOTTOM_LIMIT = 70;
const LINE_HEIGHT = 18;

const formatNaira = (amount: number) =>
  `NGN ${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount)}`;

// Keep this exactly as it was in the original file — same watermark image, unchanged.
const WATERMARK_B64 = 'iVBORw0KGgoAAAANSUhEUgAABLAAAAakCAYAAADk+eJrAAA58UlEQVR4nOzdy5UUOQJA0Zw5bQ47FtiBpdjBgh0GzYJmKCCrKj/xeZLuNWAmulOKaL2Qoi4XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIApff/y6ePZ1wAAAACrsz5v+efsC+BvPyfJh89fv519LQAAALAS4apJwAoTsgAAAOAYwlWbgDUAIQsAAAD2IVyNQcAaiJAFAAAA2xCuxiJgDUjIAgAAgMcIV2MSsAYmZAEAAMBthKuxCVgTELIAAADgOuFqDgLWRIQsAAAA+EG4mouANSEhCwAAgFUJV3MSsCYmZAEAALAK4WpuAtYChCwAAABmJVytQcBaiJAFAADALISrtQhYCxKyAAAAGJVwtSYBa2FCFgAAAKMQrtYmYCFkAQAAkCVccbkIWLwgZAEAAFAhXPGSgMVfhCwAAADOIlxxjYDFq4QsAAAAjiJc8RYBi3cJWQAAAOxFuOIWAhY3E7IAAADYinDFPQQs7iZkAQAA8CjhikcIWDxMyAIAAOBWwhXPELB4mpAFAADAa4QrtiBgsRkhCwAAgJ+EK7YkYLE5IQsAAGBdwhV7ELDYjZAFAACwDuGKPQlY7E7IAgAAmJdwxREELA4jZAEAAMxDuOJIAhaHE7IAAADGJVxxBgGL0whZAAAA4xCuOJOAxemELAAAgC7higIBiwwhCwAAoEO4okTAIkfIAgAAOI9wRZGARZaQBQAAcBzhijIBizwhCwAAYD/CFSMQsBiGkAUAALAd4YqRCFgMR8gCAAB4nHDFiAQshiVkAQAA3E64YmQCFsMTsgAAAF4nXDEDAYtpCFkAAAC/CFfMRMBiOkIWAACwMuGKGQlYTEvIAgAAViJcMTMBi+kJWQAAwMyEK1YgYLEMIQsAAJiJcMVKBCyWI2QBAAAjE65YkYDFsoQsAABgJMIVKxOwWJ6QBQAAlAlXIGDB/wlZAABAiXAFvwhY8AchCwAAOJNwBX8TsOAVQhYAAHAk4QpeJ2DBO4QsAABgT8IVvE/AghsJWQAAwJaEK7idgAV3ErIAAIBnCFdwPwELHiRkAQAA9xCu4HECFjxJyAIAAN4iXMHzBCzYiJAFAAC8JFzBdgQs2JiQBQAAaxOuYHsCFuxEyAIAgLUIV7AfAQt2JmQBAMDchCvYn4AFBxGyAABgLsIVHEfAgoMJWQAAMDbhCo4nYMFJhCwAABiLcAXnEbDgZEIWAAC0CVdwPgELIoQsAABoEa6gQ8CCGCELAADOJVxBj4AFUUIWAAAcS7iCLgEL4oQsAADYl3AFfQIWDELIAgCAbQlXMA4BCwYjZAEAwHOEKxiPgAWDErIAAOA+whWMS8CCwQlZAADwNuEKxidgwSSELAAA+J1wBfMQsGAyQhYAAKsTrmA+AhZMSsgCAGA1whXMS8CCyQlZAADMTriC+QlYsAghCwCA2QhXsA4BCxYjZAEAMDrhCtYjYMGihCwAAEYjXMG6BCxYnJAFAECdcAUIWMDlchGyAADoEa6AnwQs4DdCFgAAZxOugD8JWMBVQhYAAEcTroDXCFjAm4QsAAD2JlwB7xGwgJsIWQAAbE24Am4lYAF3EbIAAHiWcAXcS8ACHiJkAQBwL+EKeJSABTxFyAIA4D3CFfAsAQvYhJAFAMCfhCtgKwIWsCkhCwAA4QrYmoAF7ELIAgBYj3AF7EXAAnYlZAEAzE+4AvYmYAGHELIAAOYjXAFHEbCAQwlZAADjE66AowlYwCmELACA8QhXwFkELOBUQhYAQJ9wBZxNwAIShCwAgB7hCqgQsIAUIQsA4HzCFVAjYAFJQhYAwPGEK6BKwALShCwAgP0JV0CdgAUMQcgCANiecAWMQsAChiJkAQA8T7gCRiNgAUMSsgAA7idcAaMSsIChCVkAAO8TroDRCVjAFIQsAIC/CVfALAQsYCpCFgCAcAXMR8ACpiRkAQArEq6AWQlYwNSELABgBcIVMDsBC1iCkAUAzEi4AlYhYAFLEbIAgBkIV8BqBCxgSUIWADAi4QpYlYAFLE3IAgBGIFwBqxOwAC5CFgDQJFwB/CBgAbwgZAEABcIVwO8ELIArhCwA4AzCFcB1AhbAG4QsAOAIwhXA2wQsgBsIWQDAHoQrgNsIWAB3ELIAgC0IVwD3EbAAHiBkAQCPEK4AHiNgATxByAIAbiFcATxHwALYgJAFAFwjXAFsQ8AC2JCQBQBcLsIVwNYELIAdCFkAsCbhCmAfAhbAjoQsAFiDcAWwLwEL4ABCFgDMSbgCOIaABXAgIQsA5iBcARxLwAI4gZAFAGMSrgDOIWABnEjIAoAxCFcA5xKwAAKELABoEq4AGgQsgBAhCwAahCuAFgELIEjIAoBzCFcATQIWQJiQBQDHEK4A2gQsgAEIWQCwD+EKYAwCFsBAhCwA2IZwBTAWAQtgQEIWADxGuAIYk4AFMDAhCwBuI1wBjE3AApiAkAUA1wlXAHMQsAAmImQBwA/CFcBcBCyACQlZAKxKuAKYk4AFMDEhC4BVCFcAcxOwABYgZAEwK+EKYA0CFsBChCwAZiFcAaxFwAJYkJAFwKiEK4A1CVgACxOyABiFcAWwNgELACELgCzhCoDLRcAC4AUhC4AK4QqAlwQsAP4iZAFwFuEKgGsELABeJWQBcBThCoC3CFgAvEvIAmAvwhUAtxCwALiZkAXAVoQrAO4hYAFwNyELgEcJVwA84r9nXwAAAAAAvEXAAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAAACBNwAIAAAAgTcACAAAAIE3AAgAA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SBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABIE7AAAAAASBOwAAAAAEgTsAAAAABI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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPyvPTgkAAAAABD0/7UfzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbAGv1ePV0di2ewAAAABJRU5ErkJggg==';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();
    if (!dealId) throw new Error('dealId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (user.id !== deal.landlord_id && user.id !== deal.agent_id) {
      throw new Error('Permission denied. Only the landlord or agent can generate the agreement.');
    }

    if (deal.status !== 'agreement_draft' && deal.status !== 'pending_payment') {
      throw new Error(`Cannot generate an agreement for a deal in ${deal.status} status.`);
    }

    const propertyRow = Array.isArray(deal.properties) ? deal.properties[0] : deal.properties;
    const isSale = propertyRow?.transaction_type === 'sell';
    const property = propertyRow;

    const { data: tenant } = await adminSupabase
      .from('profiles').select('full_name, email').eq('id', deal.tenant_id).single();
    const { data: landlord } = await adminSupabase
      .from('profiles').select('full_name, email').eq('id', deal.landlord_id).single();
    const { data: agent } = deal.agent_id
      ? await adminSupabase.from('profiles').select('full_name, email').eq('id', deal.agent_id).single()
      : { data: null };

    const docTitle = isSale ? 'CONTRACT OF SALE' : 'TENANCY AGREEMENT';
    const partyBLabel = isSale ? 'SELLER' : 'LANDLORD';
    const partyALabel = isSale ? 'BUYER' : 'TENANT';

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const watermarkBytes = Uint8Array.from(atob(WATERMARK_B64), c => c.charCodeAt(0));
    const watermarkImage = await pdfDoc.embedPng(watermarkBytes);
    const wmWidth = 260;
    const wmHeight = wmWidth * (watermarkImage.height / watermarkImage.width);

    // ── Pagination state ──
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = TOP_Y;

    const drawWatermark = (p: typeof page) => {
      p.drawImage(watermarkImage, {
        x: (PAGE_WIDTH - wmWidth) / 2,
        y: (PAGE_HEIGHT - wmHeight) / 2,
        width: wmWidth,
        height: wmHeight,
      });
    };
    drawWatermark(page);

    const addPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawWatermark(page);
      y = TOP_Y;
    };

    const ensureSpace = (height: number) => {
      if (y - height < BOTTOM_LIMIT) addPage();
    };

    const drawText = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
      const useFont = opts.bold ? boldFont : font;
      const size = opts.size || 11;
      const color = opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1);
      const words = text.split(' ');
      let line = '';
      const maxWidth = PAGE_WIDTH - MARGIN * 2;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const width = useFont.widthOfTextAtSize(testLine, size);
        if (width > maxWidth && line) {
          ensureSpace(LINE_HEIGHT);
          page.drawText(line, { x: MARGIN, y, size, font: useFont, color });
          y -= LINE_HEIGHT;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ensureSpace(LINE_HEIGHT);
        page.drawText(line, { x: MARGIN, y, size, font: useFont, color });
        y -= LINE_HEIGHT;
      }
    };

    const sectionHeading = (text: string) => {
      ensureSpace(LINE_HEIGHT + 20);
      drawText(text, { size: 13, bold: true });
      y -= 4;
    };

    // ── Title ──
    {
      const titleSize = 18;
      const titleWidth = boldFont.widthOfTextAtSize(docTitle, titleSize);
      page.drawText(docTitle, { x: (PAGE_WIDTH - titleWidth) / 2, y, size: titleSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= titleSize + 8;
    }
    {
      const dateStr = `Generated by Handova on ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      const dateSize = 9;
      const dateWidth = font.widthOfTextAtSize(dateStr, dateSize);
      page.drawText(dateStr, { x: (PAGE_WIDTH - dateWidth) / 2, y, size: dateSize, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 14;
    }

    // ── Parties ──
    sectionHeading('PARTIES');
    const ownerName = agent?.full_name || landlord?.full_name || 'N/A';
    const ownerEmail = agent?.email || landlord?.email || '';
    drawText(`${partyBLabel}: ${ownerName}${ownerEmail ? ` (${ownerEmail})` : ''}${agent ? ' — acting as agent for the property owner' : ''}`);
    drawText(`${partyALabel}: ${tenant?.full_name || 'N/A'}${tenant?.email ? ` (${tenant.email})` : ''}`);
    y -= 10;

    // ── Property ──
    sectionHeading('PROPERTY');
    drawText(`${property.title}`);
    drawText(`${property.address}, ${property.lga}, ${property.state}`);
    if (property.listing_type === 'house' && (property.bedrooms || property.bathrooms)) {
      drawText(`${property.bedrooms || '-'} bedroom(s), ${property.bathrooms || '-'} bathroom(s)`);
    } else if (property.land_size_value) {
      drawText(`Land size: ${property.land_size_value} ${property.land_size_unit || ''}`);
    }
    y -= 10;

    // ── Terms ──
    sectionHeading(isSale ? 'SALE TERMS' : 'TENANCY TERMS');
    if (isSale) {
      drawText(`Purchase Price: ${formatNaira(deal.amount)}`);
      drawText('Payment is made in full into Handova escrow before handover proceeds.');
    } else {
      drawText(`Rent Amount: ${formatNaira(deal.amount)}${property.price_period && property.price_period !== 'outright' ? ` / ${property.price_period}` : ''}`);
      if (deal.duration) drawText(`Duration: ${deal.duration}`);
      if (deal.move_in_date) drawText(`Move-in Date: ${new Date(deal.move_in_date).toLocaleDateString('en-NG')}`);
      drawText('Rent is paid in full into Handova escrow before move-in and released to the Landlord only after the Tenant confirms move-in.');
    }
    y -= 10;

    // ── Security deposit (tenancy only) ──
    if (!isSale && deal.caution_fee) {
      sectionHeading('SECURITY DEPOSIT');
      drawText(`A caution/security deposit of ${formatNaira(deal.caution_fee)} is payable by the Tenant, held to cover damage to the Property beyond normal wear and tear.`);
      drawText('Any unused portion of the deposit is returned to the Tenant at the end of the tenancy, subject to a joint move-out inspection. Disputed deductions are handled through Handova\'s in-platform dispute process.');
      y -= 10;
    }

    // ── Use of premises (tenancy only) ──
    if (!isSale) {
      sectionHeading('USE OF PREMISES');
      drawText('The Property is to be used strictly for residential purposes. The Tenant shall not sublet, assign, or share occupancy of the Property without the prior written consent of the Landlord, and shall not use the Property for any unlawful purpose.');
      y -= 10;
    }

    // ── Maintenance & repairs (tenancy only) ──
    if (!isSale) {
      sectionHeading('MAINTENANCE AND REPAIRS');
      drawText('The Landlord is responsible for structural repairs and the upkeep of major fixtures and fittings. The Tenant is responsible for day-to-day upkeep of the Property and for repairing any damage caused by the Tenant or their guests. The Tenant shall promptly report any defects to the Landlord or Agent.');
      y -= 10;
    }

    // ── Utilities (tenancy only) ──
    if (!isSale) {
      sectionHeading('UTILITIES');
      drawText('Unless otherwise stated in the House Rules below, the Tenant is responsible for electricity, water, and waste disposal charges from the Move-in Date.');
      y -= 10;
    }

    // ── Inspection rights (tenancy only) ──
    if (!isSale) {
      sectionHeading('INSPECTION');
      drawText('The Landlord or Agent may inspect the Property with at least 24 hours\' notice to the Tenant, except in genuine emergencies.');
      y -= 10;
    }

    // ── House rules ──
    if (property.house_rules && property.house_rules.trim().length > 0) {
      sectionHeading('HOUSE RULES');
      drawText(property.house_rules, { size: 10 });
      y -= 10;
    }

    // ── Termination & notice (tenancy only) ──
    if (!isSale) {
      sectionHeading('TERMINATION AND NOTICE');
      drawText('This tenancy runs for the fixed term stated above. At the end of that term, the Tenant must vacate the Property unless both parties agree in writing to renew.');
      drawText('Either party wishing to end the tenancy before the term expires must give at least one (1) month\'s written notice, delivered through the Handova platform, unless a different period is agreed in writing by both parties.');
      drawText('The Landlord may not forcibly evict, lock out, or seize the Tenant\'s belongings without following the lawful process required under the tenancy law of the State in which the Property is located. Persistent non-payment of rent may result in the Landlord seeking lawful recovery of the Property.');
      y -= 10;
    }

    // ── Escrow ──
    sectionHeading('ESCROW');
    drawText(`Funds for this transaction are held in escrow by Handova and released to the ${partyBLabel.toLowerCase()} only after the ${partyALabel.toLowerCase()} confirms ${isSale ? 'handover' : 'move-in'} of the Property.`);
    y -= 10;

    // ── Governing law ──
    sectionHeading('GOVERNING LAW');
    drawText(`This Agreement is governed by the tenancy and property laws applicable in ${property.state} State, Nigeria.`);
    y -= 10;

    // ── Dispute resolution ──
    sectionHeading('DISPUTE RESOLUTION');
    drawText('Any dispute arising from this Agreement should first be raised through Handova\'s in-platform dispute process. Either party may also seek independent legal advice, including engaging a lawyer through Handova\'s optional Lawyer Review service, or refer the matter to a court of competent jurisdiction.');
    y -= 10;

    // ── Entire agreement ──
    sectionHeading('ENTIRE AGREEMENT');
    drawText('This document, together with any House Rules referenced above, constitutes the entire agreement between the parties regarding this transaction. If any provision of this Agreement is found invalid or unenforceable, the remaining provisions continue in full effect.');
    y -= 10;

    // ── Handova's role ──
    sectionHeading("HANDOVA'S ROLE");
    drawText('Handova acts solely as a facilitator and escrow agent for this transaction. Handova is not a party to this Agreement and is not liable for either party\'s compliance with its terms.');
    y -= 16;

    // ── Signatures ──
    ensureSpace(60);
    sectionHeading('SIGNATURES');
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 200, y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(partyALabel, { x: MARGIN, y: y - 14, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 345, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(partyBLabel, { x: 345, y: y - 14, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

    // ── Footer on every page ──
    const allPages = pdfDoc.getPages();
    allPages.forEach((p, i) => {
      const footerText = `Deal ID: ${dealId}  ·  Page ${i + 1} of ${allPages.length}`;
      const footerSize = 8;
      const footerWidth = font.widthOfTextAtSize(footerText, footerSize);
      p.drawText(footerText, { x: (PAGE_WIDTH - footerWidth) / 2, y: 30, size: footerSize, font, color: rgb(0.6, 0.6, 0.6) });
    });

    const pdfBytes = await pdfDoc.save();

    const filePath = `${dealId}/agreement.pdf`;
    const { error: uploadError } = await adminSupabase.storage
      .from('agreements')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
      .from('agreements')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);
    if (signedUrlError) throw signedUrlError;
    const publicUrl = signedUrlData.signedUrl;

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        status: 'agreement_draft',
        agreement_url: publicUrl,
        agreement_source: 'generated',
        agreement_fee: AGREEMENT_FEE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, 'agreement_generated', user.id, { fee: AGREEMENT_FEE, doc_type: docTitle });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          user_id: deal.tenant_id,
          title: isSale ? 'Contract of Sale Ready' : 'Tenancy Agreement Ready',
          body: `Your ${isSale ? 'contract' : 'agreement'} for ${property.title} is ready for review. Please review and sign.`,
          link: `/deals/${dealId}`,
          type: 'deal_state_change',
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, agreement_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Generate agreement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
