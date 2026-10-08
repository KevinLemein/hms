using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Business.Entities;
using MediCare.Data;
using Microsoft.AspNetCore.Authorization;

namespace MediCare.Controllers
{
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ApiController]
    public class DrugsController(ApplicationDbContext context) : ControllerBase
    {
        // GET: api/Drug
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Drug>>> GetDrug()
        {
            return await context.Drugs.ToListAsync();
        }

        // GET: api/Drug/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Drug>> GetDrug(int id)
        {
            var Drug = await context.Drugs.FindAsync(id);

            if (Drug == null)
            {
                return NotFound();
            }

            return Drug;
        }

        // PUT: api/Drug/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDrug(int id, Drug Drug)
        {
            if (id != Drug.Id)
            {
                return BadRequest();
            }

            context.Entry(Drug).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DrugExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Drug
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Drug>> PostDrug(Drug Drug)
        {
            context.Drugs.Add(Drug);
            await context.SaveChangesAsync();

            return CreatedAtAction("GetDrug", new { id = Drug.Id }, Drug);
        }

        // DELETE: api/Drug/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDrug(int id)
        {
            var Drug = await context.Drugs.FindAsync(id);
            if (Drug == null)
            {
                return NotFound();
            }

            context.Drugs.Remove(Drug);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool DrugExists(int id)
        {
            return context.Drugs.Any(e => e.Id == id);
        }
    }
}
