# Email Test Examples for OpsAssistant

Use these examples to test how the AI categorizes and extracts data from different types of emails.

### 1. High Priority Lead (Renovation)
**Sender:** `priya.singh@outlook.com`
**Subject:** `Urgent: Full Home Renovation Quote needed for Villa`
**Body:**
```text
Hi Team,

I visited your website and loved your portfolio. I recently bought a 4BHK Villa in Whitefield and want to get the interiors done immediately. 

I am looking for a premium finish with a budget of around ₹45 Lakhs. I need the house ready for my griha pravesh in 45 days.

Can you please schedule a site visit for this Saturday at 11 AM? My coordinate is 9988776655.

Regards,
Priya Singh
```
*Expected Result: Category: Lead, Urgency: 8-10, Budget: 45 Lakhs*

---

### 2. Routine Invoice (Vendor)
**Sender:** `billing@cement-supplies.in`
**Subject:** `Invoice #INV-2024-001 for cement delivery`
**Body:**
```text
Dear Purchase Manager,

Please find attached the invoice for the 50 bags of cement delivered to the Indiranagar project site on Monday.

Total Amount: ₹22,500
Due Date: Within 7 days

Please process the payment to the usual bank account.

Thanks,
Ramesh Traders
```
*Expected Result: Category: Invoice, Urgency: 5-7, Action: Process Payment*

---

### 3. Hiring/Job Application (HR)
**Sender:** `arun.kumar.des@gmail.com`
**Subject:** `Application for Senior Interior Designer Post`
**Body:**
```text
Variable Resume - Arun Kumar.pdf

Hello,

I am writing to express my interest in the Senior Designer role posted on LinkedIn. I have 6 years of experience in residential interiors and have handled projects worth 2Cr+.

Please review my attached portfolio. I am available for an interview anytime this week.

Best,
Arun Kumar
Mobile: 8876543210
```
*Expected Result: Category: Other/HR, Urgency: 3-5, Summary: Job application*

---

### 4. Spam/Marketing (Low Priority)
**Sender:** `offers@seo-marketing-guru.com`
**Subject:** `Get #1 Ranking on Google in 24 Hours!!!`
**Body:**
```text
Hi there,

Are you struggling to get leads? We can help you rank #1 on Google for "Interior Designers in Bangalore" within 24 hours guaranteed!

We offer the cheapest SEO packages starting at just $99. 

Click here to claim your offer now. DON'T MISS OUT.

Cheers,
The SEO Team
```
*Expected Result: Category: Spam, Urgency: 0-1*
