using UglyToad.PdfPig;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: PdfRead <pdf-path> [max-pages]");
    Environment.Exit(1);
}

var path = args[0];
var maxPages = args.Length > 1 && int.TryParse(args[1], out var parsed) ? parsed : 12;

using var doc = PdfDocument.Open(path);

Console.WriteLine($"PAGES: {doc.NumberOfPages}");
Console.WriteLine("-----BEGIN TEXT-----");

var limit = Math.Min(maxPages, doc.NumberOfPages);
for (var i = 1; i <= limit; i++)
{
    var page = doc.GetPage(i);
    Console.WriteLine($"\n=== PAGE {i} ===\n");
    Console.WriteLine(page.Text);
}

Console.WriteLine("\n-----END TEXT-----");
