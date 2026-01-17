import postgres from 'postgres';

async function main(){
  try{
    const url = process.env.DATABASE_URL;
    if(!url){
      console.error('DATABASE_URL not set');
      process.exit(2);
    }
    const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
    const rows = await sql`select id, student_id, school_id, referral_type, referral_code, issue, facility, referral_date, status, created_by, created_at from referrals order by created_at desc limit 50`;
    console.log(JSON.stringify(rows, null, 2));
    await sql.end();
  }catch(e){
    console.error('query failed', e?.message || e);
    process.exit(1);
  }
}

main();
