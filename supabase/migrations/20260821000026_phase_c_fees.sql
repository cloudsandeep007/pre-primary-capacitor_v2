-- Phase C: Fee Tracking Database Structures

-- 1. Fee Structures Table
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    class_name TEXT NOT NULL,
    fee_category TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('Monthly', 'Termly', 'Yearly', 'One-Time')),
    due_date DATE,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Student Fees Ledger Table
CREATE TABLE IF NOT EXISTS public.student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_due DECIMAL(10, 2) NOT NULL CHECK (total_due >= 0),
    amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (amount_paid >= 0),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid', 'Overdue', 'Waived', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, fee_structure_id)
);

-- 3. Fee Payments Table (Receipts)
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID NOT NULL REFERENCES public.student_fees(id) ON DELETE CASCADE,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Cheque', 'Card', 'Bank Transfer', 'UPI')),
    reference_number TEXT,
    receipt_number TEXT UNIQUE NOT NULL,
    collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Failed', 'Refunded')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Fee Structures
CREATE POLICY "Allow authenticated read on fee_structures" 
    ON public.fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins write on fee_structures" 
    ON public.fee_structures FOR INSERT WITH CHECK (has_permission('fees.write'));
CREATE POLICY "Allow admins update on fee_structures" 
    ON public.fee_structures FOR UPDATE USING (has_permission('fees.write'));
CREATE POLICY "Allow admins delete on fee_structures" 
    ON public.fee_structures FOR DELETE USING (has_permission('fees.delete'));

-- Student Fees
CREATE POLICY "Allow admins read on student_fees" 
    ON public.student_fees FOR SELECT TO authenticated USING (true); -- Extended to parents in Phase D
CREATE POLICY "Allow admins write on student_fees" 
    ON public.student_fees FOR ALL USING (has_permission('fees.write'));

-- Fee Payments
CREATE POLICY "Allow admins read on fee_payments" 
    ON public.fee_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins insert on fee_payments" 
    ON public.fee_payments FOR INSERT WITH CHECK (has_permission('fees.write'));
CREATE POLICY "Allow admins update on fee_payments" 
    ON public.fee_payments FOR UPDATE USING (has_permission('fees.write'));
CREATE POLICY "Allow admins delete on fee_payments" 
    ON public.fee_payments FOR DELETE USING (has_permission('fees.delete'));

-- 6. Trigger to auto-update student_fees total_due and status
CREATE OR REPLACE FUNCTION update_student_fee_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if it's an update on the payment
    IF TG_OP = 'INSERT' THEN
        UPDATE public.student_fees
        SET 
            amount_paid = amount_paid + NEW.amount,
            status = CASE 
                WHEN (amount_paid + NEW.amount) >= total_due THEN 'Paid'
                WHEN (amount_paid + NEW.amount) > 0 THEN 'Partially Paid'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = NEW.student_fee_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.student_fees
        SET 
            amount_paid = amount_paid - OLD.amount,
            status = CASE 
                WHEN (amount_paid - OLD.amount) >= total_due THEN 'Paid'
                WHEN (amount_paid - OLD.amount) > 0 THEN 'Partially Paid'
                ELSE 'Pending'
            END,
            updated_at = NOW()
        WHERE id = OLD.student_fee_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_fee_payment_change
    AFTER INSERT OR DELETE ON public.fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_student_fee_status();
