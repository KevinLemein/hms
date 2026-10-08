using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Business.Entities;
using MediCare.Data;
using MediCare.ViewModels;
using Microsoft.AspNetCore.Authorization;

namespace MediCare.Controllers
{
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ApiController]
    public class PrescriptionsController(ApplicationDbContext context) : ControllerBase
    {
        // GET: api/Prescription
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Prescription>>> GetPrescription()
        {
            return await context.Prescriptions.Include(i=>i.Drug).ToListAsync();
        }

        // GET: api/Prescription/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Prescription>> GetPrescription(int id)
        {
            var Prescription = await context.Prescriptions.FindAsync(id);

            if (Prescription == null)
            {
                return NotFound();
            }

            return Prescription;
        }

        // PUT: api/Prescription/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPrescription(int id, Prescription Prescription)
        {
            if (id != Prescription.Id)
            {
                return BadRequest();
            }

            context.Entry(Prescription).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PrescriptionExists(id))
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

        // POST: api/Prescription
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult> PostPrescription(Prescription Prescription)
        {
            var response = new ApiStatus();
            try
            {
               
                context.Prescriptions.Add(Prescription);
                await context.SaveChangesAsync();
                response.Code = 200;
                response.Message = "Prescription Created Successfully";
                return Ok(response);
            }
            catch (Exception ex)
            {
              
                response.Code = 500;
                response.Error = ex.InnerException.ToString();
                return Ok(response);
            }
           

        }

        // DELETE: api/Prescription/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePrescription(int id)
        {
            var Prescription = await context.Prescriptions.FindAsync(id);
            if (Prescription == null)
            {
                return NotFound();
            }

            context.Prescriptions.Remove(Prescription);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool PrescriptionExists(int id)
        {
            return context.Prescriptions.Any(e => e.Id == id);
        }
    }
}
