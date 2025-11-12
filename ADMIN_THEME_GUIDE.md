# SEEDx Admin Theme Guide

## Dark Theme Typography Hierarchy

All admin pages use a dark background (`bg-slate-950`) with glassmorphism cards. To ensure premium aesthetics and readability, follow this standardized text color hierarchy:

### Contrast Requirements

The current dark mode `--muted-foreground` (210 3.3898% 46.2745%) provides ~4.7:1 contrast against `bg-slate-950`, which meets minimum accessibility standards. However, for premium aesthetics and enhanced readability, we use explicit lighter colors for key content.

**When to use `text-muted-foreground`:** Acceptable for non-critical metadata on solid dark backgrounds.

**When to upgrade to explicit colors:** Use the hierarchy below for primary content, glassmorphism cards (where backdrop-blur can affect contrast), and any text that needs to stand out.

### Text Color Hierarchy

#### Primary Text (Highest Contrast)
**Use for:** Main headings, important data values, user names, amounts
```tsx
className="text-white"
```
**Examples:**
- Page titles: `<h1 className="text-white">Primer Management</h1>`
- Card values: `<div className="text-2xl font-bold text-white">{value}</div>`
- Table cell primary data: `<TableCell className="text-white font-medium">{name}</TableCell>`

####Secondary Text (Medium Contrast)
**Use for:** Labels, descriptions, metadata, table headers, helper text
```tsx
className="text-slate-400"
```
**Examples:**
- Card titles: `<CardTitle className="text-slate-400">Total Users</CardTitle>`
- Table headers: `<TableHead className="text-slate-400">Email</TableHead>`
- Descriptions: `<p className="text-slate-400">Monitor and manage users</p>`
- Form labels: `<Label className="text-slate-400">Email Address</Label>`

#### Tertiary Text (Subtle)
**Use for:** Timestamps, pagination info, very subtle metadata
```tsx
className="text-slate-500"
```
**Examples:**
- Timestamps: `<span className="text-sm text-slate-500">2 hours ago</span>`
- Pagination: `<p className="text-xs text-slate-500">Showing 1-50 of 200</p>`

### Component-Specific Patterns

#### Cards (Glassmorphism)
```tsx
<Card className="bg-white/5 border-white/10 backdrop-blur-sm">
  <CardHeader>
    <CardTitle className="text-slate-400">Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-white">{value}</div>
    <p className="text-xs text-slate-400 mt-1">Description</p>
  </CardContent>
</Card>
```

#### Tables
**Headers:** Use `text-slate-400` to distinguish from data cells
**Primary data cells:** Use `text-white font-medium` for names, amounts, IDs
**Secondary data cells:** Use `text-slate-300` for emails, dates, metadata

```tsx
<Table>
  <TableHeader>
    <TableRow className="border-white/10 hover:bg-white/5">
      <TableHead className="text-slate-400">Name</TableHead>
      <TableHead className="text-slate-400">Email</TableHead>
      <TableHead className="text-slate-400">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-white/10 hover:bg-white/5">
      <TableCell className="text-white font-medium">{user.name}</TableCell>
      <TableCell className="text-slate-300">{user.email}</TableCell>
      <TableCell className="text-white font-medium">{formatCurrency(amount)}</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Input Fields
```tsx
<Input
  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
  placeholder="Search..."
/>
```

#### Selects
```tsx
<Select>
  <SelectTrigger className="bg-white/5 border-white/10 text-white">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

#### Badges
Use colored backgrounds with matching text:
```tsx
// Success/Approved
<Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border">
  Approved
</Badge>

// Warning/Pending
<Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 border">
  Pending
</Badge>

// Error/Rejected
<Badge className="bg-red-500/10 text-red-400 border-red-500/30 border">
  Rejected
</Badge>

// Info/Neutral
<Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 border">
  Unverified
</Badge>
```

#### Buttons
```tsx
// Primary actions
<Button variant="default">Action</Button>

// Secondary actions on dark background
<Button variant="ghost" className="text-slate-400 hover:text-white">
  Cancel
</Button>

// Outline on dark background
<Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
  Clear Filters
</Button>
```

### Common Mistakes to Avoid

❌ **DON'T USE:**
- `text-muted-foreground` for primary content or on glassmorphism cards (prefer explicit colors for premium aesthetic)
- Default text colors without explicit specification on important elements
- Dark text colors on dark backgrounds
- Mixing badge color schemes (e.g., emerald background with red text)

✅ **DO USE:**
- `text-white` for primary content (headings, important values)
- `text-slate-400` for secondary content (labels, table headers)
- `text-slate-300` for table data cells (better visibility than muted-foreground)
- `text-slate-500` for subtle metadata (timestamps, pagination)
- `text-muted-foreground` only for non-critical metadata on solid backgrounds where acceptable

### Page Structure Example

```tsx
<div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
  <div className="container mx-auto p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">Page Title</h1>
        <p className="text-slate-400 mt-1">Page description</p>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">
            Metric Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {value}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Main Content */}
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Content Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  </div>
</div>
```

## Audit Checklist

When reviewing any admin page, verify:
- [ ] Page title is `text-white`
- [ ] Page description is `text-slate-400`
- [ ] Card titles are `text-slate-400`
- [ ] Card values are `text-white`
- [ ] Table headers are `text-slate-400`
- [ ] Table primary cells are `text-white font-medium` for names/amounts
- [ ] Table secondary cells are `text-slate-300` for emails/dates
- [ ] Input fields have `text-white` and `placeholder:text-slate-500`
- [ ] Select triggers have `text-white`
- [ ] All badges use colored text (emerald-400, yellow-400, red-400, slate-400)
- [ ] `text-muted-foreground` is only used for non-critical metadata on solid dark backgrounds
- [ ] Primary content on glassmorphism cards uses explicit white/slate colors (not muted-foreground)
- [ ] No default/unspecified text colors on important elements

## Reference Pages

✅ **Good Examples (Follow These):**
- `AdminPrimers.tsx` - Proper text hierarchy throughout
- `AdminRegenerators.tsx` - Consistent white/grey text
- `AdminInvestments.tsx` - Premium dark theme implementation

⚠️ **Needs Review:**
- `Admin.tsx` - Uses `text-muted-foreground` extensively
- Other legacy admin pages - May need text color updates
