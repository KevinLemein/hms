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
    public class GenderController(ApplicationDbContext context) : ControllerBase
    {
        // GET: api/Gender
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Gender>>> GetGender()
        {
            return await context.Gender.ToListAsync();
        }

        // GET: api/Gender/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Gender>> GetGender(int id)
        {
            var Gender = await context.Gender.FindAsync(id);

            if (Gender == null)
            {
                return NotFound();
            }

            return Gender;
        }

        // PUT: api/Gender/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutGender(int id, Gender Gender)
        {
            if (id != Gender.Id)
            {
                return BadRequest();
            }

            context.Entry(Gender).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!GenderExists(id))
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

        // POST: api/Gender
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Gender>> PostGender(Gender Gender)
        {
            context.Gender.Add(Gender);
            await context.SaveChangesAsync();

            return CreatedAtAction("GetGender", new { id = Gender.Id }, Gender);
        }

        // DELETE: api/Gender/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGender(int id)
        {
            var Gender = await context.Gender.FindAsync(id);
            if (Gender == null)
            {
                return NotFound();
            }

            context.Gender.Remove(Gender);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool GenderExists(int id)
        {
            return context.Gender.Any(e => e.Id == id);
        }
    }
}
